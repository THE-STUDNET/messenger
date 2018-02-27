import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';
import { MailSignInPage } from '../mailSignIn/mailSignIn';
import { AboutPage } from '../about/about';

@Component({
  selector: 'page-welcome',
  templateUrl: 'welcome.html'
})
export class WelcomePage {

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account ) {}

    LoginWithLinkedIn(){
        this.account.linkedinLogin();
    }

    navToClassicSignIn(){
        this.navCtrl.push(MailSignInPage);
    }

    navToAbout(){
        this.navCtrl.push(AboutPage);
    }

}
