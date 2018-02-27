import { Component, Input } from '@angular/core';

import { ItemModel, PageModel } from '../../providers/api/api.module';
import { Hangout } from '../../providers/hangout/hangout.provider';

@Component({
  selector: 'liveclass',
  templateUrl: 'liveclass.html'
})

export class LiveClassComponent {

    @Input('conversation') conversation: any;

    loading: boolean = true;
    item: any;
    page: any;

    constructor( private pageModel: PageModel, private itemModel: ItemModel, private hangout: Hangout ) {}

    ngOnChanges(){
        this.loading = true;

        this.itemModel.queue([this.conversation.item_id]).then(()=>{
            this.item = this.itemModel.list[this.conversation.item_id];

            return this.pageModel.queue([this.item.datum.page_id]).then(()=>{
                this.page = this.pageModel.list[this.item.datum.page_id];
                this.loading = false;
            });
        });
    }

    launchHangout(){
        this.hangout.launch( this.conversation.id );
    }

}
