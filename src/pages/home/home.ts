import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
// PROVIDERS
import { Account, UserModel, ConversationsPaginator, ConversationModel } from '../../providers/api/api.module';
import { WebSocket, SoundsManager } from '../../providers/shared/shared.module';
import { Events } from '../..//providers/events/events.module';
// PAGES
import { ProfilePage } from '../profile/profile';
import { NewMessagePage } from '../newMessage/newMessage';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

    public user: any;
    public loading:boolean = true;
    public socket: any;
    public onMessage: any;
    public eventListeners: any[] = [];

    constructor( public navCtrl: NavController, public account: Account, public userModel: UserModel, 
        public conversationsPaginator: ConversationsPaginator, public conversationModel: ConversationModel,
        private ws: WebSocket, private events: Events, private sounds: SoundsManager ) {
            // Get user account informations.
            userModel.get([account.session.id]).then(()=>{
                this.user = userModel.list[account.session.id];
            });
            // Get user conversations.
            if( conversationsPaginator.list.length ){
                this.loading = false;
            }

            this.onMessage = this._onMessage.bind(this);
            this.ws.get().then(socket => {
                this.socket = socket;
                this.socket.on('ch.message', this.onMessage );
            });

            this.eventListeners.push( this.events.on('notification::message', event=>{
                let data = event.data[1];
                this._onMessage({conversation_id:data.conversation,id:data.message});
            }) );
        }

    refresh( refresher ){
        this.conversationsPaginator.get(true).then( () => refresher.complete(), () => refresher.complete());
    }

    next( infiniteScroll ){
        this.conversationsPaginator.next().then( () => infiniteScroll.complete() );
    }

    goToProfile(){
        this.navCtrl.push(ProfilePage);   
    }

    goToNewMessage(){
        this.navCtrl.push(NewMessagePage);
    }

    trackByConversation( index, conversation ){
        return conversation.id;
    }

    onLoad(){
        this.loading = false;
    }

    _onMessage( data ){
        let idx = this.conversationsPaginator.indexes.indexOf( data.conversation_id );
        if( idx === -1 || this.conversationsPaginator.list[idx].message.id !== data.id ){
            this.conversationsPaginator.get(true).then( list =>{
                this._notifyConversations( list );
                this.sounds.play('newmessage');  
            });
        }
    }

    _notifyConversations( list ){
        if( list ){
            list.forEach( conversation => {
                this.events.process('conversation.'+conversation.id+'.updated');
            });
        }
    }

    ionViewWillEnter(){
        this.conversationsPaginator.get(true).then( list =>{
            this._notifyConversations( list );
            this.loading = false;
        });
    }

    ngOnDestroy(){
        if( this.socket ){
            this.socket.off('ch.message', this.onMessage );
        }
        this.eventListeners.forEach( listenerId => this.events.off(undefined,listenerId) );
    }
}
