import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Account, Api } from '../../providers/api/api.module';
import { ConversationPage } from '../conversation/conversation';
import { _getDeferred } from '../../functions/getDeferred';

@Component({
  selector: 'page-newMessage',
  templateUrl: 'newMessage.html'
})
export class NewMessagePage {

    private numberPerPage: number = 10;
    private page: number = 1;

    public subject: string = '';
    public lastSubject: string; 
    public results: number[];
    public total: number;

    public abortPromise: any;
    public nextAbortPromise: any;
    public scrollEnabled: boolean = true;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account, public api: Api ) {
        this.search();
    }

    search( value?: string ){
        if( value !== undefined ){
            this.subject = value;
        }

        let newResearch = this.subject.trim();

        if( this.lastSubject !== newResearch ){
            this.scrollEnabled = true;
            this.lastSubject = newResearch;
            // Abort concurrent requests...
            if( this.abortPromise ){
                this.abortPromise.resolve();
            }
            if( this.nextAbortPromise ){
                this.nextAbortPromise.resolve();
                this.nextAbortPromise = undefined;
            }
            // Search...
            this.page = 1;
            this.results = [];
            this.total = 0;
            this.abortPromise = _getDeferred();
            this.api.send('user.getListId', { search: this.subject, filter:{ p:this.page, n: this.numberPerPage, o:{'user$contact_state':'DESC'} } }, this.abortPromise.promise )
                .then( users => {
                    this.results = users.list;
                    this.total = users.count;

                    let idx = this.results.indexOf(this.account.session.id); 
                    if( idx !== -1 ){
                        this.results.splice(idx,1);
                        this.total--;
                    }

                    this.abortPromise = undefined;
                }, () => this.abortPromise=undefined );
        }
    }

    next( infiniteScroll ){
        if( this.results.length < this.total ){
            this.page++;
            this.nextAbortPromise = _getDeferred();
            this.api.send('user.getListId', { search: this.subject, filter:{ p:this.page, n: this.numberPerPage, o:{'user$contact_state':'DESC'} } }, this.abortPromise )
                .then( users => {
                    let idx = users.list.indexOf(this.account.session.id); 
                    if( idx !== -1 ){
                        users.list.splice(idx,1);
                        this.total--;
                    }

                    this.results.push( ...users.list );
                    infiniteScroll.complete();

                    if( this.results.length >= this.total ){
                        this.scrollEnabled = false;
                    }
                }, () => infiniteScroll.complete() );
        }else{
            infiniteScroll.complete();
        }
    }

    trackByResult( index, user_id ){
        return user_id;
    }

    tapOnResult( user_id:number ){
        this.navToUserConversation( [user_id] );
    }

    navToUserConversation( users:number[] ){
        this.navCtrl.push(ConversationPage,{users:users});
    }

    back(){
        this.navCtrl.pop();
    }

}