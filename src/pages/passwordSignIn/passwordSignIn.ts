import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, ModalController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';
import { ForgotPasswordPage } from '../forgotPassword/forgotPassword';

@Component({
  selector: 'page-password-signin',
  templateUrl: 'passwordSignIn.html'
})
export class PasswordSignInPage {

    public password: string;
    public infos: any;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account, 
        public modalCtrl: ModalController, public navParams: NavParams ) {
        this.infos = navParams.get('user_infos');
    }

    login(){
        if( this.password ){
            this.account.login({user:this.infos.email,password:this.password}).catch(error => {
                let message;
                if( error.code === this.account.errors.PASSWORD_INVALID ){
                    message = 'Incorrect password.';
                }
                if( message ){
                    this.toastCtrl.create({
                        message: message,
                        duration: 3000
                    }).present();
                }
            });
        }else{
            this.toastCtrl.create({
                message: 'Password is empty !',
                duration: 3000
            }).present();
        }
    }

    forgotPassword(){
        this.modalCtrl.create( 
            ForgotPasswordPage,
            { email: this.infos.email },
            { cssClass: 'alert-modal'}).present();
    }

    back(){
        this.navCtrl.pop();
    }

}
