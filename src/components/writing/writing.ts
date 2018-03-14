import { Component, Input } from '@angular/core';
import { Account, MessagesPaginator } from '../../providers/api/api.module';

@Component({
  selector: 'writing',
  templateUrl: 'writing.html'
})

export class WritingComponent {
    @Input('loaded') loaded: any;
    @Input('writer') writer: any;
    @Input('paginator') paginator: MessagesPaginator;

    constructor( account: Account) {}

    ngOnChanges(){}

    _isPreviousDifferentAuthor(){
        return !this.paginator || 
            this.paginator.sendingMessages.length || 
            ( this.paginator.list.length 
                && ( this.paginator.failedMessages[this.paginator.list[0].id] || this.paginator.list[0].user_id !== this.writer.datum.id ));
    }

    ngAfterViewInit(){
        if( this.loaded ){
            this.loaded();
            this.loaded = undefined;
        }
    }
}
