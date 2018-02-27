import { Component, Input } from '@angular/core';

@Component({
  selector: 'writing',
  templateUrl: 'writing.html'
})

export class WritingComponent {
    @Input('loaded') loaded: any;
    @Input('writer') writer: any;
    

    constructor() {}

    ngOnChanges(){}

    _isPreviousDifferentAuthor(){
        // TO DO LATER
        /*if( this.paginator ){
            if( this.message.sid ){
                return !(this.paginator.sendings.indexOf(this.message) > 0) && (!this.paginator.list.length || this.paginator.list[0].user_id !== this.account.session.id);
            }else{
                let idx = this.paginator.indexes.indexOf( this.message.id );
                if( idx !== -1 && idx < this.paginator.indexes.length-1 ){
                    return this.paginator.list[idx+1].user_id !== this.message.user_id;
                }
            }
        }
        return true;*/
    }

    ngAfterViewInit(){
        if( this.loaded ){
            this.loaded();
            this.loaded = undefined;
        }
    }
}
