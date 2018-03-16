import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Network } from '@ionic-native/network';
import { Subscription } from 'rxjs/Subscription';

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
    public hasToRefreshConversations: any;
    public hasToGetUser: any;
    public loading:boolean = true;
    public socket: any;
    public onMessage: any;
    public eventListeners: any[] = [];
    public subscriptions: Subscription[] = [];

    constructor( public navCtrl: NavController, public account: Account, public userModel: UserModel, public toastCtrl: ToastController,
        public conversationsPaginator: ConversationsPaginator, public conversationModel: ConversationModel,
        private ws: WebSocket, private events: Events, private sounds: SoundsManager, private network: Network ) {
            // Get user account informations.
            if( userModel.list[account.session.id] && userModel.list[account.session.id].datum ){
                this.user = userModel.list[account.session.id];
            }
            this._getUser();
            
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

            this.subscriptions.push( this.network.onConnect().subscribe(()=>{
                if( this.hasToRefreshConversations ){
                    this.hasToRefreshConversations = false;
                    this._refreshConversations();
                }
                if( this.hasToGetUser ){
                    this.hasToGetUser = false;
                    this._getUser();
                }
            }) );
        }

    refresh( refresher ){
        this.conversationsPaginator.get(true).then( () => refresher.complete() ).catch( ()=>{
            refresher.complete();
            if( this.network.type === 'none' ){
                this.hasToRefreshConversations = true;
            }
            this.toastCtrl.create({
                message: this.network.type === 'none' ? 'No internet connection, retry later!':'Sorry, an error occured!',
                duration: 3000
            }).present();
        });
    }

    next( infiniteScroll ){
        this.conversationsPaginator.next().then( () => infiniteScroll.complete() ).catch( () => {
            setTimeout( () => {
                this.toastCtrl.create({
                    message: this.network.type === 'none' ? 'No internet connection, retry later!':'Sorry, an error occured!',
                    duration: 3000
                }).present();
                
                infiniteScroll.complete()
            }, 300 );
        });
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

    _onMessage( data ){
        let idx = this.conversationsPaginator.indexes.indexOf( data.conversation_id );
        if( idx === -1 || this.conversationsPaginator.list[idx].message.id !== data.id ){
            this.conversationsPaginator.get(true).then( list =>{
                this._notifyConversations( list );
                this.sounds.play('newmessage');  
            }).catch( () => {
                if( this.network.type === 'none' ){
                    this.hasToRefreshConversations = true;
                }
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
        console.log('IONWILLENTER');
        this._refreshConversations();
    }

    _refreshConversations(){
        if( this.network.type !== 'none' ){
            this.conversationsPaginator.get(true).then( list =>{
                this._notifyConversations( list );
                this.loading = false;
            }).catch(()=>{ 
                if( this.network.type === 'none' ){
                    this.hasToRefreshConversations = true;
                }
            });
        }else{
            console.log('ION-LAUNCH-PAGINATOR-READY')
            this.conversationsPaginator.ready().then(()=>{
                this.loading = false;
            }).catch(()=>{ console.log('ERR-ON-CVN-READY'); });
            this.hasToRefreshConversations = true;
        }
    }

    _getUser(){
        this.userModel.get([this.account.session.id]).then(()=>{
            this.user = this.userModel.list[this.account.session.id];
        }).catch(()=>{
            this.hasToGetUser = true;
        });
    }

    ngOnDestroy(){
        if( this.socket ){
            this.socket.off('ch.message', this.onMessage );
        }
        this.eventListeners.forEach( listenerId => this.events.off(undefined,listenerId) );
        this.subscriptions.forEach( sub => sub.unsubscribe() );
    }
}
