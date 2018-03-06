import { Component } from '@angular/core';
import { NavController, NavParams, ToastController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';
import { ForgotPasswordPage } from '../forgotPassword/forgotPassword';
import { TermsSignInPage } from '../termsSignIn/termsSignIn';
import { ModalService } from '../../providers/shared/shared.module';

@Component({
  selector: 'page-password-signin',
  templateUrl: 'passwordSignIn.html'
})
export class PasswordSignInPage {

    public password: string;
    public infos: any;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account, 
        public navParams: NavParams, public modal: ModalService ) {
        this.infos = navParams.get('user_infos');
    }

    login(){
        if( this.password ){
            this.account.login({user:this.infos.email,password:this.password})
                .then(()=>{
                    if( !this.account.session.cgu_accepted ){
                        this.navCtrl.push( TermsSignInPage );
                    }
                })
                .catch(error => {
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
                message: 'Password is empty!',
                duration: 3000
            }).present();
        }
    }

    forgotPassword(){
        this.modal.show( ForgotPasswordPage, {email: this.infos.email} );
    }

    back(){
        this.navCtrl.pop();
    }

}
