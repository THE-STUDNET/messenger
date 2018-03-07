
import { Component } from '@angular/core';
import { ViewController, ToastController, NavParams } from 'ionic-angular';
import { Api } from '../../providers/api/api.module';
import { Network } from '@ionic-native/network';


@Component({
    selector: 'conversationPopover',
    templateUrl: 'conversationPopover.html'
})
export class ConversationPopover {

    private conversation_id: number;

    constructor(public viewCtrl: ViewController, public toastCtrl: ToastController, public api: Api, 
        private network: Network, public navParams:NavParams) {
        this.conversation_id = this.navParams.data.conversation_id;
    }
  
    report() {
        this.api.send('report.add',{conversation_id:this.conversation_id,reason:''}).then(()=>{
            this.toastCtrl.create({
                message: 'This conversation has been reported!',
                duration: 2000
            }).present()
        }).catch((err)=>{
            let message = err.code === -32000 ? 'This conversation was already reported': 'Sorry, an error occured!';

            if( this.network.type === 'none' && err.code !== -32000 ){
                message = 'No internet connection, retry later!'
            }

            this.toastCtrl.create({
                message: message,
                duration: 2000
            }).present()
        });

        this.viewCtrl.dismiss();
    }
}