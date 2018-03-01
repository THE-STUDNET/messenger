import { Component, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NavController, NavParams, Content } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { Subscription } from 'rxjs/Subscription';

import { PipesProvider } from '../../pipes/pipes.provider';
import { MessagesPaginator } from '../../providers/api/services/messages.provider';
import { Events } from '../../providers/events/events.module';
import { WebSocket, SoundsManager } from '../../providers/shared/shared.module';
import { Account, ConversationModel, UserModel, MessagesPaginatorProvider,  
    PageModel, ConversationService, ConversationUnreadDateModel } from '../../providers/api/api.module';

import { _getDeferred } from '../../functions/getDeferred';

@Component({
  selector: 'page-conversation',
  templateUrl: 'conversation.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationPage {
    @ViewChild(Content) content: Content;

    public loading:boolean = true;
    public loadingUsers: boolean = true;

    public creating:Promise<any>;
    public socket:any;
    public text:string;
    public typing:boolean = false;
    public users: number[] = [];
    public writer: any;
    public conversation: any;
    public creationInfos: any;
    public messagesPaginator: MessagesPaginator;
    public usersLastUnreadId: any = {};

    public queuedMessages: any[] = [];
    public indexes: any[] = [];

    public onKeyboardShow: Subscription;
    public refreshingPromise: Promise<any>;
    public onMessageLoaded:any;
    public writingTimeout: any;

    public socketListeners: any = {};
    public eventListeners: any = [];

    public loadBehaviour: string = 'godown';
    public prevScrollHeight: number;
    public prevScrollY: number;
    
    constructor( public cd: ChangeDetectorRef, private keyboard: Keyboard, public navCtrl: NavController, public params: NavParams, 
        public account: Account, private msgPaginatorProvider: MessagesPaginatorProvider, public cvnService: ConversationService, 
        public events: Events, public ws: WebSocket, public sounds: SoundsManager, public pipesProvider: PipesProvider,
        public cvnModel: ConversationModel, public userModel: UserModel, public pageModel:PageModel, private cURD: ConversationUnreadDateModel ) {

        this.conversation = params.get('conversation');
        this.onMessageLoaded = this._onMessageLoaded.bind(this);

        // Bind scroll on keyboard open...
        this.onKeyboardShow = this.keyboard.onKeyboardShow().subscribe( ()=>{
            this.content.scrollTo( 0, this.content.getContentDimensions().scrollHeight );
        });

        if( !this.conversation ){
            let users = params.get('users');
            // Build other people array
            users.forEach( id => {
                if( id !== account.session.id ){
                    this.users.push(id);
                }
            });
            // Try to get conversation !
            if( this.users.length ){
                this.cvnService.getUsersConversationId( users ).then( conversation_id => {
                    if( conversation_id ){
                        this.cvnModel.get([conversation_id]).then( () => {
                            this.conversation = this.cvnModel.list[conversation_id].datum;
                            this.load();
                        });
                    }else{
                        this.creationInfos = { users: this.users };
                        this.loadVirtualConversation();
                    }
                });
            }else{
                this.navCtrl.pop();
            }           
        }else{
            // Build other people array
            this.conversation.users.forEach( id => {
                if( id !== account.session.id ){
                    this.users.push(id);
                }
            });
            this.load();
        }
    }

    loadVirtualConversation(){
        this.loadUsers().then(()=>{
            this.loading = false;
            this.cd.markForCheck();
        });
    }

    load( creating?:boolean ){            
        // Set messages paginator & get last messages...
        this.messagesPaginator = this.msgPaginatorProvider.getPaginator(this.conversation.id);
        // Listen to paginator self updates ( When a message is sent the paginator refresh its own list ).
        this.eventListeners.push( this.events.on('cvn'+this.conversation.id+'.messages.update',this._onRefresh.bind(this)) );
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
        // Get users informations...
        let p1 = this.loadUsers();
        // Get messages...
        let p2 = this.messagesPaginator.get(true).then(()=>{
            this.cvnService.read( this.conversation.id );
        });
        
        let p3;
        if( creating ){
            let deferred = _getDeferred();
            p3 = deferred.promise;
            deferred.resolve();
        }else{
            // Get conversation users read dates
            p3 = this.cURD.get([this.conversation.id],true);
        }
        // Wait for informations => Loaded! 
        p1.then(()=>p2.then(()=> p3.then(() => {
            Array.prototype.unshift.apply(this.indexes , this.messagesPaginator.indexes.slice().reverse() );
            if( creating ){
                this._createEmptyReadDates();
            }else{
                this._buildReadDates( this.messagesPaginator.list );
            }
            if( this.loading ){
                this.loading = false;                
                this.cd.markForCheck();
            }
        }))).catch(()=>{ console.log('catch'); });
    }

    loadUsers(): Promise<any>{
        return this.userModel.get(this.users).then(()=>{
            // If one to one conversation -> get organization infos.
            if( this.users.length === 1 && this.userModel.list[this.users[0]].datum.organization_id ){
                return this.pageModel.get([this.userModel.list[this.users[0]].datum.organization_id]).then(()=>{
                    this.loadingUsers = false;
                    this.cd.markForCheck();
                },()=>{ console.log('Pages loading err'); });
            }else{
                this.loadingUsers = false;
                this.cd.markForCheck();
            }
        });
    }
    
    previous( refresher ){
        if( this.messagesPaginator ){
            let d = this.content.getContentDimensions();
            this.prevScrollHeight = d.scrollHeight;
            this.prevScrollY = d.scrollTop;
            this.loadBehaviour = 'stay';

            this.messagesPaginator.next().then(()=>{
                let oldLength = this.indexes.length;
                // Prepend old messages id in conversation message list.
                Array.prototype.unshift.apply(this.indexes , this.messagesPaginator.indexes.slice( oldLength ).reverse() );
                // Build read dates.
                this._buildReadDates( this.messagesPaginator.list.slice( oldLength ) );
                // Complete refresh & update view.
                refresher.complete();
                this.cd.markForCheck();
            },()=>refresher.complete());
        }
    }

    _buildReadDates( messageList ){
        if( Object.keys(this.usersLastUnreadId).length !== this.users.length ){
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
        if( this.conversation.id === conversation_id && this.indexes.indexOf(message_id) === -1 ){
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
                    this.socket.emit('ch.read', {id: this.conversation.id, users: this.users, message_id: this.indexes[this.indexes.length-1] });
                }
            });
            return this.refreshingPromise;
        }
    }

    _onRefresh(){
        Array.prototype.push.apply(this.indexes , this.messagesPaginator.indexes.slice( 0, -this.indexes.length ).reverse() );
        this.cd.markForCheck();
    }

    onTyping(){
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

    send( textarea, $event ){
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
                    this.creating = this.cvnService.createConversation( this.creationInfos.users.concat([this.account.session.id]), this.creationInfos.name ).then( conversation_id => {
                        let id = parseInt(conversation_id);
                        // Set messages paginator & get last messages...
                        this.messagesPaginator = this.msgPaginatorProvider.getPaginator(id);
                        // Get conversation & reload component. 
                        this.cvnModel.get([id]).then(()=>{
                            this.conversation = this.cvnModel.list[id].datum;
                            this.load();
                            // Send queued messages
                            this._sendQueue();
                        });
                    });
                }
            }
        }
    }

    private _sendQueue(){
        this.queuedMessages.forEach( message => {
            this.messagesPaginator.send( message.text );
        });
        this.queuedMessages = [];
        // Update UI
        this.cd.markForCheck();
    }

    printName(): string{
        if( !this.loadingUsers ){
            if( (this.conversation||this.creationInfos).name && (this.conversation||this.creationInfos).name !== 'Chat' ){
                return (this.conversation||this.creationInfos).name.toUpperCase();
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
                return (this.conversation||this.creationInfos).users.length+' participants';
            }
        }
    }

    trackMessage( index, model ){
        return model.id;
    }

    trackMessageId(index, id){
        return id;
    }

    messageTapped( message ){
        if( message.sendingFailed ){
            this.loadBehaviour = 'godown';
            this.messagesPaginator.resend( message );
        }
    }

    back(){
        this.navCtrl.popToRoot();
    }

    ngOnDestroy(){
        this.onKeyboardShow.unsubscribe();
        this._clearSocketListeners();
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
