import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

    public credentials: {user:string,password:string} = {
        user: '',
        password: ''
    };

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account ) {}

    Login(){

        if( this.credentials.password && this.credentials.user ){
            this.account.login( this.credentials ).catch(error => {
                let message;
                if( error.code === this.account.errors.PASSWORD_INVALID ){
                    message = 'Incorrect password.';
                }else if( error.code === this.account.errors.ACCOUNT_INVALID ){
                    message = 'We did not find an account matching this email address.';
                }

                if( message )
                    this.toastCtrl.create({
                        message: message,
                        duration: 3000
                    }).present();
            });
        }else{
            this.toastCtrl.create({
                message: this.credentials.user?'Please enter your password.':'Please enter your email.',
                duration: 3000
            }).present();
        }
    }

    LoginWithLinkedIn(){
        this.account.linkedinLogin();
    }

}
