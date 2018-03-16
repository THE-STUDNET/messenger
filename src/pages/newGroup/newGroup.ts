import { Component, ViewChild } from '@angular/core';
import { NavController, ToastController, Content } from 'ionic-angular';
import { Account, Api } from '../../providers/api/api.module';
import { ConversationPage } from '../conversation/conversation';
import { _getDeferred } from '../../functions/getDeferred';

@Component({
  selector: 'page-newGroup',
  templateUrl: 'newGroup.html'
})
export class NewGroupPage {
    @ViewChild(Content) content: Content;

    private numberPerPage: number = 10;
    private page: number = 1;

    public subject: string = '';
    public lastSubject: string; 
    public results: number[];
    public total: number;

    public abortPromise: any;
    public nextAbortPromise: any;
    public scrollEnabled: boolean = true;
    
    public selectedUsers: number[] = [];

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
            // USING "order":{"type":"affinity"}, ( ALTERNATIVE => filter:{ o:{'user$contact_state':'DESC'} })
            this.api.send('user.getListId', { search: this.subject, order:{type:"affinity"}, filter:{ p:this.page, n: this.numberPerPage } }, this.abortPromise.promise )
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
            this.api.send('user.getListId', { search: this.subject, order:{type:"affinity"}, filter:{ p:this.page, n: this.numberPerPage } }, this.abortPromise )
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
        let idx = this.selectedUsers.indexOf( user_id );
        if( idx === -1 ){
            this.selectedUsers.push(user_id);
        }else{
            this.selectedUsers.splice(idx,1);
        }
        this.content.resize();
    }

    tapOnSelected( user_id ){
        let idx = this.selectedUsers.indexOf( user_id );
        if( idx !== -1 ){
            this.selectedUsers.splice(idx,1);
        }
        this.content.resize();
    }

    start(){
        this.navToUserConversation( this.selectedUsers );
    }

    navToUserConversation( users:number[] ){
        this.navCtrl.push(ConversationPage,{users:users});
    }

    back(){
        this.navCtrl.popToRoot();
    }

    isSelected( user_id ){
        return this.selectedUsers.indexOf( user_id ) !== -1;
    }
}