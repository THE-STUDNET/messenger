import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';
import { Account, UserModel, ConversationModel, ConversationUnreadDateModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';
import { ConversationPage } from '../../pages/conversation/conversation';
import { Events } from '../../providers/events/events.module';
import { WebSocket } from '../../providers/shared/shared.module';

@Component({
  selector: 'conversation',
  templateUrl: 'conversation.html'
})

export class ConversationComponent {

    @Input('conversationId') id: any;

    loading: boolean = true;
    other_users: number[] = [];
    readAvatarUsers: number[] = [];
    readCountUsers: number;
    item: any;
    page: any;
    conversation: any;
    updateListenerId: any;
    public socketListeners: any = {};
    public socket: any;

    constructor( public navCtrl: NavController, private account:Account, private cvnModel: ConversationModel, 
        public lastUnreadIdModel: ConversationUnreadDateModel, public ws: WebSocket,
        private userModel:UserModel, public pipesProvider:PipesProvider, public events: Events ) {

        ws.get().then( socket => {
            this.socket = socket;
            this._addSocketListener('ch.read', this.onRead.bind(this) );
        });
    }

    ngOnChanges(){
        this.load();
    }

    load(){
        if( this.updateListenerId ){
            this.events.off( undefined, this.updateListenerId );
        }

        this.updateListenerId = this.events.on('conversation.'+this.id+'.updated',()=>{
            this.cvnModel.get([this.id], true);
        });

        let p1 = this.lastUnreadIdModel.queue([this.id], true);
        let p2 = this.cvnModel.queue([this.id], true);
        
        p1.then(()=>p2.then(()=>{
            // Set conversation.
            this.conversation = this.cvnModel.list[this.id];
            // Build other users
            this.other_users = [];
            this.conversation.datum.users.forEach( id => {
                if( this.account.session.id !== id ){
                    this.other_users.push(id);
                }
            });
            this.buildUnread();
            // Get users data.
            this.userModel.queue(this.other_users).then(()=>{
                this.loading = false;
            });
        }));
    }

    buildUnread(){
        this.readAvatarUsers.splice(0, this.readAvatarUsers.length );
        this.readCountUsers = 0;
        if( this.conversation.datum.message.user_id === this.account.session.id ){
            let luiModel = this.lastUnreadIdModel.list[this.id].datum;

            Object.keys(luiModel).forEach( user_id => {
                if( luiModel[user_id] === null || luiModel[user_id] > this.conversation.datum.message.id ){
                    this.readAvatarUsers.push( parseInt(user_id) );                        
                }
            });

            if( this.readAvatarUsers.length > 2 ){
                this.readCountUsers = this.readAvatarUsers.splice(1,this.readAvatarUsers.length-1).length;
            }
        }
    }

    printName(): string{
        if( !this.loading ){
            if( this.conversation.datum.name && this.conversation.datum.name !== 'Chat' ){
                return this.conversation.name;
            }else{
                var name = '';
                this.other_users.forEach( id => {
                    name += (name?', ':'')+this.pipesProvider.username( this.userModel.list[id].datum, this.other_users.length>1?true:false );
                });
                return name;
            }
        }
    }

    printUser(){
        if( this.conversation.datum.message && this.conversation.datum.message.user_id ){
            if( this.conversation.datum.message.user_id == this.account.session.id ){
                return 'You: ';
            }else if( this.other_users.length > 1 ){
                let user = this.userModel.list[this.conversation.datum.message.user_id].datum;
                return (user.firstname[0]+user.lastname[0]).toUpperCase()+': ';
            }
        }
        return '';
    }

    isUnread(){
        if( this.conversation.datum.message && this.conversation.datum.message.user_id ){
            return this.account.session.id !== this.conversation.datum.message.user_id
                && this.conversation.datum.conversation_user.read_date;
        }
    }

    goToConversation(){
        this.navCtrl.push(ConversationPage,{ conversation: this.conversation.datum });
    }

    onRead( data ){
        if( this.conversation && data.id === this.id 
            && this.other_users.indexOf( data.user_id ) !== -1
            && this.readAvatarUsers.indexOf( data.user_id ) === -1
            && this.conversation.datum.message.user_id == this.account.session.id ){
            if( this.conversation.datum.message.id <= data.message_id ){
                if( !this.readAvatarUsers.length || (this.readAvatarUsers.length<2 && !this.readCountUsers) ){
                    this.readAvatarUsers.push(data.user_id);
                }else{
                    this.readCountUsers++;
                }
            }
        }
    }

    _addSocketListener( event: string, fn: Function ){
        if( this.socket && !this.socketListeners[event] ){
            this.socketListeners[event]  = fn;
            this.socket.on( event, fn );
        }
    }

    _clearSocketListeners(){
        if( this.socket ){
            Object.keys(this.socketListeners).forEach( name => {
                this.socket.off( name, this.socketListeners[name] );
                delete( this.socketListeners[name] );
            });
        }
    }

    ngOnDestroy(){
        this._clearSocketListeners();
        this.events.off( undefined, this.updateListenerId );
    }
}
