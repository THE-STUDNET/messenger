import { Component, Input } from '@angular/core';
import { ToastController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';
import { ModalService } from '../../providers/shared/shared.module';

@Component({
  selector: 'page-forgot-password',
  templateUrl: 'forgotPassword.html'
})
export class ForgotPasswordPage {

    @Input() data: any;

    constructor(public modal: ModalService, public toastCtrl: ToastController, public account: Account ) {}

    resendPassword(){
        this.account.resendAccountLink( this.data.email ).then( () => {
            this.toastCtrl.create({
                message: 'Mail sent!',
                duration: 3000
            }).present();
        }, () => {
            this.toastCtrl.create({
                message: 'Sorry an error occured!',
                duration: 3000
            }).present();
        }).then(()=>this.modal.hide());
    }

    cancel(){
        this.modal.hide();
    }
}
