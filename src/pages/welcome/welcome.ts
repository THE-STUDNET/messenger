import { Component } from '@angular/core';
import { NavController, ToastController, Platform } from 'ionic-angular';
import { AppAvailability } from '@ionic-native/app-availability';

import { Account } from '../../providers/api/services/account.provider';
import { MailSignInPage } from '../mailSignIn/mailSignIn';
import { AboutPage } from '../about/about';

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.html'
})
export class WelcomePage {


    hasLinkedin: boolean = false;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account,
        private platform:Platform, private appAvailability: AppAvailability ) {

        if( this.platform.is('ios') ){
            this.appAvailability.check('linkedin://').then( ()=>{
                this.hasLinkedin = true;
            }, ()=>{

            });
        }else{
            this.hasLinkedin = true;
        }
    }

    LoginWithLinkedIn(){
        this.account.linkedinLogin().then( () => {},function( err ){
            if( err && err.errorCode ){
                this.toastCtrl.create({
                    message: 'Sorry an error occured!',
                    duration: 3000
                }).present();
            }else{
                this.toastCtrl.create({
                    message: 'Sorry, your Linkedin account is not connected to Twic yet',
                    duration: 3000
                }).present();
            }        
        }.bind(this));
    }

    navToClassicSignIn(){
        this.navCtrl.push(MailSignInPage);
    }

    navToAbout(){
        this.navCtrl.push(AboutPage);
    }

}
