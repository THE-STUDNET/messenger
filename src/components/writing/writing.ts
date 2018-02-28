import { Component, Input } from '@angular/core';
import { Account } from '../../providers/api/api.module';

@Component({
  selector: 'writing',
  templateUrl: 'writing.html'
})

export class WritingComponent {
    @Input('loaded') loaded: any;
    @Input('writer') writer: any;
    @Input('paginator') paginator: any;

    constructor( account: Account) {}

    ngOnChanges(){}

    _isPreviousDifferentAuthor():boolean{
        return !this.paginator || 
            this.paginator.sendings.length || 
            ( this.paginator.list.length 
                && this.paginator.list[0].user_id !== this.writer.datum.id );
    }

    ngAfterViewInit(){
        if( this.loaded ){
            this.loaded();
            this.loaded = undefined;
        }
    }
}
