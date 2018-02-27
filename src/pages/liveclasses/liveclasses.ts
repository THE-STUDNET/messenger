import { Component } from '@angular/core';
import { AlertController } from 'ionic-angular';

import { ConversationModel, ItemModel, PageModel, LiveClassesService } from '../../providers/api/api.module';
import { Events } from '../../providers/events/events.provider';
import { Hangout } from '../../providers/hangout/hangout.provider';

@Component({
  selector: 'page-lc',
  templateUrl: 'liveclasses.html'
})

export class LiveClassesPage {

    public conversations: Array<number> = [];
    public page: number = 0;
    public itemStartingListener: number;

    constructor(public conversationModel: ConversationModel, public lcService: LiveClassesService,
        private events: Events, private hangout: Hangout, public alertController: AlertController,
        private pageModel: PageModel, private itemModel: ItemModel ) {

        lcService.getList().then(() => {
            console.log('FUCK', lcService );
            this.conversations = lcService.conversations.slice( 0, 10 );
            this.page = 1;
        });

        // When user receive item.starting notification => if not tapped, ask user if he want to launch liveclass.
        this.itemStartingListener = events.on('notification::item.starting', event => {
            let tapped = event.data[0],
                data = event.data[1];

            if( data.type === 'LC' && !tapped && data.conversation_id && data.id ){

                this.itemModel.queue([data.id]).then(()=>{
                    let item = this.itemModel.list[data.id];

                    return this.pageModel.queue([item.datum.page_id]).then(()=>{
                        let page = this.pageModel.list[item.datum.page_id],
                            alert = this.alertController.create({
                                title: item.datum.title,
                                message: 'This live class is starting ! Do you want to join it ?',
                                buttons: [
                                    {text: 'Cancel'},
                                    {text: 'Launch', handler: () => {
                                        this.hangout.launch( data.conversation_id );
                                    }}
                                ]
                            });
                        // Display alert.
                        alert.present();
                    });
                });
            }
        });
    }

    ngOnDestroy(){
        // Remove item.starting notification listener.
        this.events.off('notification::item.starting', this.itemStartingListener );
    }

    refresh( refresher ){
        return this.lcService.getList()
            .then(() => {
                this.conversations = this.lcService.conversations.slice( 0, 10 );
                this.page = 1;
                refresher.complete();
            })
            .catch( refresher.complete );
    }

    next( infiniteScroll ){
        if( this.lcService.conversations.length > this.page*10 ){
            this.page++;
            Array.prototype.push.apply(this.conversations, this.lcService.conversations.slice( 10*(this.page - 1), 10*this.page ) );

        }
        infiniteScroll.complete();
    }

}
