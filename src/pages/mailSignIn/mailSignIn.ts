import { Component } from '@angular/core';
import { NavController, ToastController, AlertController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';
import { PasswordSignInPage } from '../passwordSignIn/passwordSignIn';
import { AlmostSignInPage } from '../almostSignIn/almostSignIn';

@Component({
  selector: 'page-mail-signin',
  templateUrl: 'mailSignIn.html'
})
export class MailSignInPage {

    public email: string = '';
    private checking: Promise<any>;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, 
        public alertCtrl: AlertController, public account: Account ) {}

    checkSignInMail(){
        if( this.email && !this.checking ){
            this.checking = this.account.checkExistingMail( this.email ).then(( data )=>{
                this.checking = undefined;
                if( !data ){
                    this.alertCtrl.create({
                        cssClass: 'twic-alert',
                        title: 'Sorry',
                        subTitle: 'Twic account not found.',
                        buttons: [{text:'Ok',cssClass:'primary'}]
                    }).present();
                }
                else if( data && data.is_active ){
                    // Redirect to passwordSignIn.
                    this.navCtrl.push(PasswordSignInPage,{user_infos:data});
                }else{
                    this.navCtrl.push(AlmostSignInPage,{email:this.email});
                }
            },() => {
                this.checking = undefined;
                this.toastCtrl.create({
                    message: 'Sorry an error occured !',
                    duration: 3000
                }).present();
            });
        }else{
            this.toastCtrl.create({
                message: 'Email is empty !',
                duration: 3000
            }).present();
        }
    }

    back(){
        this.navCtrl.pop();
    }

}
