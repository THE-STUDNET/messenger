import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Account, UserModel, MessagesPaginator } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';


@Component({
  selector: 'message',
  templateUrl: 'message.html'
})

export class MessageComponent {
    // Inputs ...
    @Input('loaded') loaded: any;
    @Input('messageId') messageId?: any;
    @Input('paginator') paginator: MessagesPaginator;
    @Input('message') message?: any;
    @Input('readIds') readIds?: any;
    @Input('sending') sending?: boolean;
    // Emitting...
    @Output('fileTapped') onFileTapped = new EventEmitter<any>();

    public user:any
    public lastReadUsers: number[] = [];

    constructor( public account:Account, public userModel:UserModel, public pipesProvider:PipesProvider ) {}

    ngOnChanges(){
        if( this.messageId ){
            this.message = this.paginator.getFromIndex(this.messageId);
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

    emitFileTapped(){
        this.onFileTapped.emit();
    }

    // (OK) Return true if we have to day information separator. 
    showPreviousDay(){
        if( this.paginator ){
            let idx = this.paginator.indexes.indexOf( this.message.id );
            if( idx !== -1 && idx < this.paginator.indexes.length-1 ){
                let previousMessageDate = new Date( this.paginator.list[idx+1].created_date ).getDate(),
                    messageDate = new Date(this.message.created_date).getDate();
                return messageDate !== previousMessageDate;
            }else if( idx === this.paginator.indexes.length-1 ){
                return true;
            }
        }
    }

    // (OK) Return true if next displayed message is from another day.
    _isNextMessageADifferentDay(){
        if( this.paginator ){
            let next = this._getNextMessage();
            if( next && next.created_date ){
                let current_created_date = this.message.created_date;
                if( this.message.prev_id ){
                    current_created_date = this.paginator.getFromIndex( this.message.prev_id ).created_date;
                }
                return (new Date(next.created_date)).getDate() !== (new Date(current_created_date)).getDate();
            }
        }
    }

    showAuthor(){
        return this.showPreviousDay() || this._isPreviousDifferentAuthor();        
    }

    // (OK) Return true if previous message exist OR is from another user.
    _isPreviousDifferentAuthor(){
        if( this.paginator ){
            let previous = this._getPreviousMessage();
            return !previous || previous.user_id !== this.message.user_id;
        }
        return true;
    }

    // (OK) Return true if next message is from another user OR if its last conversation displayed message.
    _isNextDifferentAuthor(){
        if( this.paginator ){
            var next = this._getNextMessage();
            return !next || this.message.user_id !== next.user_id;
        }
        return true;
    }

    _getNextMessage(){
        if( this.paginator ){
            if( this.sending ){
                let idx = this.paginator.sendingMessages.indexOf(this.message);
                return this.paginator.sendingMessages[idx+1];
            }else{
                let idx = this.paginator.displayableIndexes.indexOf( this.message.id || this.message.uid );
                if( idx === this.paginator.displayableIndexes.length-1 ){
                    if( this.paginator.sendingMessages.length ){
                        return this.paginator.sendingMessages[0];
                    }
                    return false;
                }else{
                    return this.paginator.getFromIndex( this.paginator.displayableIndexes[idx+1] );
                }
            }
        }
        return false;
    }

    _getPreviousMessage(){
        if( this.paginator ){
            if( this.sending ){
                let idx = this.paginator.sendingMessages.indexOf(this.message);
                if( idx === 0 ){
                    return this.paginator.getFromIndex( this.paginator.displayableIndexes[this.paginator.displayableIndexes.length-1] );
                }else{
                    return this.paginator.sendingMessages[idx-1];
                }
            }else{
                let idx = this.paginator.displayableIndexes.indexOf( this.message.id || this.message.uid );
                if( idx === 0 ){
                    return false;
                }else{
                    return this.paginator.getFromIndex( this.paginator.displayableIndexes[idx-1] );
                }
            }
        }
        return false;
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

}
