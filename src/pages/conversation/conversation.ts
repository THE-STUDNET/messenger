import { Component, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NavController, NavParams, Content, PopoverController } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Network } from '@ionic-native/network';
import { Subscription } from 'rxjs/Subscription';

import { PipesProvider } from '../../pipes/pipes.provider';
import { MessagesPaginator } from '../../providers/api/services/messages.provider';
import { Events } from '../../providers/events/events.module';
import { WebSocket, SoundsManager } from '../../providers/shared/shared.module';
import { Account, ConversationModel, UserModel, MessagesPaginatorProvider,  
    PageModel, ConversationService, ConversationUnreadDateModel } from '../../providers/api/api.module';

import { ConversationPopover } from '../../components/conversationPopover/conversationPopover';
import { ViewerPage } from '../viewer/viewer';

import { _getDeferred } from '../../functions/getDeferred';

@Component({
  selector: 'page-conversation',
  templateUrl: 'conversation.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationPage {
    @ViewChild(Content) content: Content;

    public loading:boolean = true;

    public creating:Promise<any>;
    public socket:any;
    public text:string;
    public typing:boolean = false;
    public users: number[] = [];
    public writer: any;
    public conversation: any;
    public usersLastUnreadId: any = {};

    public queuedMessages: any[] = [];
    public refreshingPromise: Promise<any>;
    public writingTimeout: any;

    public loadBehaviour: string = 'godown';
    public prevScrollHeight: number;
    public prevScrollY: number;


    // NEW!
    // Various messages service references
    public messagesPaginator: MessagesPaginator;
    // Function reference given to message components (called on message display)
    public onMessageLoaded: any;
    // PROMISES
    public users_promise: Promise<any>;
    // FLAGS
    public loadingUsers: boolean = true;
    public loadingConversation: boolean = true;
    public hasToCreate: boolean = false;
    // LISTENERS...
    private socketListeners: any = {};
    private eventListeners: any = [];
    private subscriptions: Subscription[] = [];


    sendFile( $event ){
        if( $event.target.files.length ){
            let file = $event.target.files[0];
            this.loadBehaviour = 'godown';

            console.log('FILE CHANGED', $event, file );

            if( this.messagesPaginator ){
                this.messagesPaginator.send( undefined, undefined, file );
            }else{
                this.queuedMessages.push({ 
                    user_id: this.account.session.id, 
                    text: undefined,
                    file: file,
                    created_date: (new Date()).toISOString()
                });

                if( !this.creating ){   
                    this.creating = this.cvnService.createConversation( this.users.concat([this.account.session.id]), 'Chat' ).then( conversation_id => {
                        let id = parseInt(conversation_id);
                        // Set messages paginator & get last messages...
                        this.messagesPaginator = this.msgPaginatorProvider.getPaginator(id);
                        // Get conversation & reload component. 
                        this.getConversation( id ).then( () => {
                            this.loadConversation( true ).then(()=>{
                                this._sendQueue();
                            });
                        });
                    });
                }
            }
        }
    }
    
    private _listenCommonEvents(){
        // Scroll to conversation bottom when keyboard is opened.
        this.subscriptions.push( this.keyboard.onKeyboardShow().subscribe( ()=>{
            this.content.scrollTo( 0, this.content.getContentDimensions().scrollHeight );
        }) );
    }

    private _listenConversationEvents(){
        // Listen to paginator self updates ( When a message is sent the paginator refresh its own list ).
        this.eventListeners.push( this.events.on('cvn'+this.conversation.id+'.updated',this._onRefresh.bind(this)) );
        // Listen to notification
        this.eventListeners.push( this.events.on('notification::message', ( event )=>{
            let wasTapped = event.data[0],
                data = event.data[1];
            if( !wasTapped ){
                this._onMessage( data.conversation, data.message );
            }
        }) );
        // Listen to websocket
        this.ws.get().then( socket => {
            this.socket = socket;
            this._addSocketListener('ch.message', this._onWSMessage.bind(this) );
            this._addSocketListener('ch.writing', this._onWSWriting.bind(this) );
            this._addSocketListener('ch.read', this._onWSRead.bind(this) );
        });
    }

    // Complete 'usersLastUnreadId' from a message list.
    // (Object telling which of your message is the last read by each conversation users) 
    private _buildReadDates( messageList ){
        if( Object.keys(this.usersLastUnreadId).length !== this.users.length
            && this.cURD.list[this.conversation.id] && this.cURD.list[this.conversation.id].datum ){
            let usersLastUnreadId = this.cURD.list[this.conversation.id].datum;

            messageList.some( message => {
                if( this.account.session.id === message.user_id ){
                    this.users.forEach( user_id =>{
                        if( this.usersLastUnreadId[user_id] === undefined ){
                            if( usersLastUnreadId[user_id] === undefined ){
                                this.usersLastUnreadId[user_id] = false;
                            }else if( usersLastUnreadId[user_id] > message.id || usersLastUnreadId[user_id] === null ){
                                this.usersLastUnreadId[user_id] = message.id;
                            }
                        }
                    });
                    return Object.keys(this.usersLastUnreadId).length === this.users.length;
                }
                return false;
            });
        }
    }

    private _build( empty?:boolean ){
        if( empty ){
            this._createEmptyReadDates();
        }else{
            this._buildReadDates( this.messagesPaginator.list );
        }

        this.hasToCreate = false;
        if( this.loading ){
            this.loading = false;                
            this.cd.markForCheck();
        }
    }

    private requestConversation( empty ){
        var deferred = _getDeferred();

        let readPromise;
        if( empty ){
            let deferred = _getDeferred();
            readPromise = deferred.promise;
            deferred.resolve();
        }else{
            readPromise = this.cURD.get([this.conversation.id],true);
        }

        this.messagesPaginator.get(true)
            .then(()=>{ this.cvnService.read( this.conversation.id ); })
            .then(()=> readPromise.then( () => {
                deferred.resolve();
            }))
            .catch( err => {
                if( this.network.type === 'none' ){
                    // Schedule another loadUsers on reconnect.
                    let subscription;
                    subscription = this.network.onConnect().subscribe(()=> {
                        this.subscriptions.splice( this.subscriptions.indexOf(subscription), 1 );
                        subscription.unsubscribe();
                        this.requestConversation(empty).then( ()=> deferred.resolve() ).catch( err => deferred.reject(err) );
                    });
                    // Push subcription in list to cancel it if user go back.
                    this.subscriptions.push( subscription );
                }else{
                    deferred.reject( err );
                }
            });

        return deferred.promise;
    }

    private loadConversation( empty?:boolean ){
        // Set messages paginator & get last messages...
        this.messagesPaginator = this.msgPaginatorProvider.getPaginator(this.conversation.id);
        return this.messagesPaginator.ready().then(() => {
            // Listen to conversation events...
            this._listenConversationEvents();
            // Build
            if( this.network.type === 'none' ){
                this._build( empty );
            }else{
                return this.requestConversation( empty ).then(()=>{
                    this._build(empty);
                }).catch( err => {
                    // DISPLAY AN ERROR
                    console.log('ERR', err);
                });
            }
        });
    }

    loadCreation(){
        this.hasToCreate = true;
        this.loading = false;
        this.cd.markForCheck();
        /*this.users_promise.then(()=>{
            this.loadingConversation = false;
            this.cd.markForCheck();
        });*/
    }

    loadUsers(): Promise<any>{
        let deferred = _getDeferred();
        this.userModel.get(this.users).then(()=>{
            // If one to one conversation -> get organization infos.
            if( this.users.length === 1 && this.userModel.list[this.users[0]].datum.organization_id ){
                return this.pageModel
                    .get([this.userModel.list[this.users[0]].datum.organization_id])
                    .then(()=>deferred.resolve());
            }else{
                deferred.resolve();
            }
        }).catch( err => {
            if( this.network.type === 'none' ){
                // Schedule another loadUsers on reconnect.
                let subscription;
                subscription = this.network.onConnect().subscribe(()=> {
                    this.subscriptions.splice( this.subscriptions.indexOf(subscription), 1 );
                    subscription.unsubscribe();
                    this.loadUsers().then( ()=> deferred.resolve() ).catch( err => deferred.reject(err) );
                });
                // Push subcription in list to cancel it if user go back.
                this.subscriptions.push( subscription );
            }else{
                deferred.reject( err );
            }
        });
        return deferred.promise;
    }

    getConversation( id:number ){
        let deferred = _getDeferred();

        this.cvnModel.get([id]).then( () => {
            this.conversation = this.cvnModel.list[id].datum;
            deferred.resolve();
        }, err => {
            if( this.network.type === 'none' ){
                // Schedule another getConversation on reconnect.
                let subscription;
                subscription = this.network.onConnect().subscribe(()=> {
                    this.subscriptions.splice( this.subscriptions.indexOf(subscription), 1 );
                    subscription.unsubscribe();
                    this.getConversation( id ).then(()=> deferred.resolve());
                });
                // Push subcription in list to cancel it if user go back.
                this.subscriptions.push( subscription );
            }else{
                // Display an error
                console.log('ERROR conversation:getConversation', err, id );
                deferred.reject();
            }
        });

        return deferred.promise;
    }

    asyncLoadConversation(){
        return this.cvnService.getUsersConversationId( this.params.get('users') ).then( id => {
            if( id ){
                this.getConversation( id ).then(()=>{
                    this.loadConversation();
                });
            }else{
                this.loadCreation();
            }
        }, err => {
            if( this.network.type === 'none' ){
                // Schedule another asyncLoadConversation on reconnect.
                let subscription;
                subscription = this.network.onConnect().subscribe(()=> {
                    this.subscriptions.splice( this.subscriptions.indexOf(subscription), 1 );
                    subscription.unsubscribe();
                    this.asyncLoadConversation();
                });
                // Push subcription in list to cancel it if user go back.
                this.subscriptions.push( subscription );
            }else{
                // Display an error.
                console.log('ERROR conversation:asyncLoad', err );
            }
        });
    }

    constructor( public cd: ChangeDetectorRef, private keyboard: Keyboard, public navCtrl: NavController, public params: NavParams, 
        public account: Account, private msgPaginatorProvider: MessagesPaginatorProvider, public cvnService: ConversationService, 
        public events: Events, public ws: WebSocket, public sounds: SoundsManager, public pipesProvider: PipesProvider,
        public popOverController: PopoverController, public network: Network,
        public cvnModel: ConversationModel, public userModel: UserModel, public pageModel:PageModel, private cURD: ConversationUnreadDateModel ) {

        // Define self binded function for message components.
        this.onMessageLoaded = this._onMessageLoaded.bind(this);
        // Try to set conversation.
        this.conversation = params.get('conversation');
        // Build users array.    
        ( params.get('users') || this.conversation.users ).forEach( id => {
            if( id !== account.session.id ){
                this.users.push(id);
            }
        });
        // Load users.
        this.users_promise = this.loadUsers().then(()=> {
            this.loadingUsers = false;
            this.cd.markForCheck();
        }).catch(()=>{
            // Display error !
        });
        // Listen to common events.
        this._listenCommonEvents();
        // If conversation, load conversation.
        // Else try to get conversation & load it OR set creating to true.
        if( this.conversation ){
            this.loadConversation();
        }else{
            this.asyncLoadConversation();
        }
    }

    showSettings( $event ){
        let popover = this.popOverController.create(ConversationPopover, {conversation_id: this.conversation.id });
        popover.present({
            ev: $event
        });
    }
    
    previous( refresher ){
        if( this.messagesPaginator ){
            let d = this.content.getContentDimensions();
            this.prevScrollHeight = d.scrollHeight;
            this.prevScrollY = d.scrollTop;
            this.loadBehaviour = 'stay';

            this.messagesPaginator.next().then( data =>{
                // Build read dates.
                this._buildReadDates( data );
                // Complete refresh & update view.
                refresher.complete();
                this.cd.markForCheck();
            },()=>refresher.complete());
        }
    }

    _createEmptyReadDates(){
        this.users.forEach( user_id =>{
            this.usersLastUnreadId[user_id] = false;
        });
    }

    _onMessageLoaded(){
        if( this.loadBehaviour === 'godown' ){
            this.content.scrollTo( 0, this.content.getContentDimensions().scrollHeight, 0 );
        }else if( this.loadBehaviour === 'stay' ){
            let futureSY = this.prevScrollY + ( this.content.getContentDimensions().scrollHeight - this.prevScrollHeight );
            this.content.scrollTo( 0, futureSY, 0 );
            this.prevScrollHeight = this.content.getContentDimensions().scrollHeight;
            this.prevScrollY = futureSY;
        }
    }

    _onWSMessage( data ){
        this._onMessage( data.conversation_id, data.id );
    }

    _onMessage( conversation_id, message_id ){
        if( this.conversation.id === conversation_id && this.messagesPaginator.indexes.indexOf(message_id) === -1 ){
            if( this.writer ){
                if( this.writingTimeout ){
                    clearTimeout( this.writingTimeout );
                    this.writer = undefined;
                    this.writingTimeout = undefined;
                }
            }
            let promise = this.refresh();
            if( promise ){
                promise.then(()=>{
                    this.sounds.play('newmessage');
                });
            }
        }
    }

    _onWSWriting( data ){
        if( data.id === this.conversation.id && data.user_id
            && this.users.indexOf( data.user_id ) !== -1
            && this.userModel.list[data.user_id] && this.userModel.list[data.user_id].datum ){

            let dim = this.content.getContentDimensions();
            if( dim.scrollHeight - dim.scrollTop - dim.contentHeight < 15 ){
                this.loadBehaviour = 'godown';
            }else if( this.loadBehaviour !== 'stay' ){
                this.loadBehaviour = 'untouch';
            }
            
            this.writer = this.userModel.list[data.user_id];
            this.cd.markForCheck();

            if( this.writingTimeout ){
                clearTimeout( this.writingTimeout );
            }

            this.writingTimeout = setTimeout( ()=>{
                this.writer = undefined;
                this.cd.markForCheck();
                this.writingTimeout = undefined;
            }, 5000 );
        }
    }

    _onWSRead( data ){
        if( data.id === this.conversation.id ){
            if( this.refreshingPromise ){
                this.refreshingPromise.then( () => {
                    this._processRead( data );
                });
            }else{
                this._processRead( data );
            }
        }
    }

    _processRead( data ){
        this.messagesPaginator.list.some( message => {
            if( this.account.session.id === message.user_id ){
                if( message.id <= data.message_id && this.users.indexOf( data.user_id ) !== -1 ){
                    this.usersLastUnreadId[data.user_id] = message.id;
                    return true;
                }
            }
            return false;
        });
        this.usersLastUnreadId = Object.assign({},this.usersLastUnreadId);
        this.cd.markForCheck();
    }

    refresh(){
        if( this.messagesPaginator ){
            this.refreshingPromise = this.messagesPaginator.get(true).then(()=>{
                this._onRefresh();
                this.cvnService.read( this.conversation.id );
                if( this.socket ){
                    this.socket.emit('ch.read', {id: this.conversation.id, users: this.users, message_id: this.messagesPaginator.indexes[0] });
                }
            });
            return this.refreshingPromise;
        }
    }

    _onRefresh(){
        this.cd.markForCheck();
    }

    onTyping( textarea ){
        if( this.text.slice(-1) === '\n' ){
            this.text = this.text.slice(0,-1);
            this.send( textarea );
        }
        // Resize content...
        this.content.resize();
        // Send writing events...
        if( this.socket && this.conversation.id ){
            if( !this.typing ){
                this.typing = true;
                this.socket.emit('ch.writing',{ id:this.conversation.id, users: this.users });
                setTimeout( ()=>{ this.typing=false; }, 900 );
            }
        }
    }

    send( textarea, $event? ){
        textarea.focus();
        if( $event ){
            $event.preventDefault();
        }        
        if( this.text.trim() ){
            let text = this.text.trim();
            this.text = '';
            this.loadBehaviour = 'godown';

            if( this.messagesPaginator ){
                this.messagesPaginator.send( text );
            }else{
                this.queuedMessages.push({ 
                    user_id: this.account.session.id, 
                    text:text,
                    created_date: (new Date()).toISOString(),
                    promise: true
                });
                if( !this.creating ){   
                    this.creating = this.cvnService.createConversation( this.users.concat([this.account.session.id]), 'Chat' ).then( conversation_id => {
                        let id = parseInt(conversation_id);
                        // Set messages paginator & get last messages...
                        this.messagesPaginator = this.msgPaginatorProvider.getPaginator(id);
                        // Get conversation & reload component. 
                        this.getConversation( id ).then( () => {
                            this.loadConversation( true ).then(()=>{
                                this._sendQueue();
                            });
                        });
                    });
                }
            }
        }
    }

    private _sendQueue(){
        this.queuedMessages.forEach( message => {
            this.messagesPaginator.send( message.text, message.library, message.file );
        });
        this.queuedMessages = [];
        // Update UI
        this.cd.markForCheck();
    }

    printName(): string{
        if( !this.loadingUsers ){
            if( this.conversation && this.conversation.name && this.conversation.name !== 'Chat' ){
                return this.conversation.name.toUpperCase();
            }else{
                let name = '', short = this.users.length>1?true:false;
                this.users.forEach( id => {
                    name += (name?', ':'')+this.pipesProvider.username( this.userModel.list[id].datum, short );
                });
                return name.toUpperCase();
            }
        }
    }

    printSubtitle(): string{
        if( !this.loadingUsers ){
            if( this.users.length === 1 ){
                return this.pageModel.list[this.userModel.list[this.users[0]].datum.organization_id].datum.title;
            }else{
                return (this.users.length+1)+' participants';
            }
        }
    }

    trackMessage( index, model ){
        return model.id;
    }

    trackMessageId(index, id){
        return id;
    }

    messageTapped( messageId ){
        let message = this.messagesPaginator.getFromIndex( messageId );
        if( message.failed ){
            this.loadBehaviour = 'godown';
            this.messagesPaginator.resend( message );
        }
    }

    fileTapped( messageId ){
        let libraries = [],
            index = 0;

        this.messagesPaginator.list.forEach( message => {
            if( message.library ){
                libraries.push( Object.assign({ created_date:message.created_date, owner_id: message.user_id }, message.library ));
                if( message.id === messageId ){
                    index = libraries.length-1;
                }
            }
        });

        this.navCtrl.push( ViewerPage,{libraries: libraries, current: index });
    }

    back(){
        this.navCtrl.popToRoot();
    }

    ngOnDestroy(){
        this._clearSocketListeners();
        this.subscriptions.forEach( sub => sub.unsubscribe() );
        this.eventListeners.forEach( listenerId => this.events.off(undefined,listenerId) );
    }

    _addSocketListener( event: string, fn: Function ){
        if( this.socket && !this.socketListeners[event] ){
            this.socketListeners[event]  = fn;
            this.socket.on( event, fn );
        }
    }

    _clearSocketListeners(){
        Object.keys(this.socketListeners).forEach( name => {
            this.socket.off( name, this.socketListeners[name] );
            delete( this.socketListeners[name] );
        });
    }
}
