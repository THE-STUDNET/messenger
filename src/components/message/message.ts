import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Account, UserModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';


@Component({
  selector: 'message',
  templateUrl: 'message.html'
})

export class MessageComponent {
    @Input('loaded') loaded: any;
    @Input('messageId') messageId?: any;
    @Input('paginator') paginator: any;
    @Input('message') message?: any;
    @Input('readIds') readIds?: any;
    public user:any
    public lastReadUsers: number[] = [];

    constructor( public account:Account, public userModel:UserModel, public pipesProvider:PipesProvider ) {}

    ngOnChanges(){
        console.log('Change?!', this.messageId );
        if( this.messageId ){
            this.message = this.paginator.list[this.paginator.indexes.indexOf(this.messageId)];
        }
        if( this.readIds && this.message.user_id === this.account.session.id ){
            this.lastReadUsers.splice( 0, this.lastReadUsers.length );

            Object.keys(this.readIds).forEach( user_id => {
                if( this.readIds[user_id] === this.message.id ){
                    this.lastReadUsers.push(parseInt(user_id));
                }
            });
        }
        this.user = this.userModel.list[ this.message.user_id ];  
    }

    showPreviousDay(){
        if( this.paginator ){
            let idx = this.paginator.indexes.indexOf( this.message.id );
            if( idx !== -1 && idx < this.paginator.indexes.length-1 ){
                let previousMessageDate = new Date( this.paginator.list[idx+1].created_date ).getDate(),
                    messageDate = new Date(this.message.created_date).getDate();
                return messageDate !== previousMessageDate;
            }
        }
    }

    _isNextMessageADifferentDay(){
        if( this.paginator ){
            let idx = this.paginator.indexes.indexOf( this.message.id );
            if( idx !== -1 && idx > 0 ){
                let nextMessageDate = new Date( this.paginator.list[idx-1].created_date ).getDate(),
                    messageDate = new Date(this.message.created_date).getDate();
                return messageDate !== nextMessageDate;
            }
        }
    }

    showAuthor(){
        return this.showPreviousDay() || this._isPreviousDifferentAuthor();        
    }

    _isPreviousDifferentAuthor(){
        if( this.showPreviousDay() ){

        }
        if( this.paginator ){
            if( this.message.sid ){
                return !(this.paginator.sendings.indexOf(this.message) > 0) && (!this.paginator.list.length || this.paginator.list[0].user_id !== this.account.session.id);
            }else{
                let idx = this.paginator.indexes.indexOf( this.message.id );
                if( idx !== -1 && idx < this.paginator.indexes.length-1 ){
                    return this.paginator.list[idx+1].user_id !== this.message.user_id;
                }
            }
        }
        return true;
    }

    _isNextDifferentAuthor(){
        if( this.paginator ){
            if( this.message.sid ){
                return this.paginator.sendings.indexOf(this.message) === this.paginator.sendings.length-1;
            }else{
                let idx = this.paginator.indexes.indexOf( this.message.id );
                if( idx > 0 ){
                    return this.paginator.list[idx-1].user_id !== this.message.user_id;
                }else if( idx === 0 && this.message.user_id === this.account.session.id && this.paginator.sendings.length ){
                    return false;
                }
            }
        }
        return true;
    }

    _hasNotRoundedBorder(){
        return this._isNextMessageADifferentDay() || this._isNextDifferentAuthor();
    }

    printDay(){
        if( new Date(this.message.created_date).getDate() === new Date().getDate() ){
            return 'Today';
        }else{
            return DatePipe.prototype.transform( this.message.created_date, 'mediumDate', undefined, 'en-US' );    
        }
    }

    ngAfterViewInit(){
        if( this.loaded ){
            this.loaded();
            this.loaded = undefined;
        }
    }
    
    messageTap(){
        

    }
}
