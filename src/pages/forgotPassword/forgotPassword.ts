import { Component } from '@angular/core';
import { NavController, ToastController, NavParams } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';

@Component({
  selector: 'page-forgot-password',
  templateUrl: 'forgotPassword.html'
})
export class ForgotPasswordPage {

    public email: string;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, 
        public account: Account, public navParams: NavParams ) {
        this.email = navParams.get('email');
    }

    resendPassword(){
        this.account.resendAccountLink( this.email ).then( () => {
            this.toastCtrl.create({
                message: 'Invitation sent!',
                duration: 3000
            }).present();
        }, () => {
            this.toastCtrl.create({
                message: 'Sorry an error occured !',
                duration: 3000
            }).present();
        });
    }

    back(){
        this.navCtrl.pop();
    }

}
