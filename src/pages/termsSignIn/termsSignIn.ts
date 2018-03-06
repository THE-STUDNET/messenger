import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, Platform } from 'ionic-angular';
import { Account } from '../../providers/api/services/account.provider';

@Component({
  selector: 'page-terms-signin',
  templateUrl: 'termsSignIn.html'
})
export class TermsSignInPage {

    public password: string;
    public infos: any;
    public backButtonListener: any;

    constructor(public navCtrl: NavController, public toastCtrl: ToastController, public account: Account, 
        public navParams: NavParams, private platform: Platform ) {
        this.infos = navParams.get('user_infos');


        this.backButtonListener = this.platform.registerBackButtonAction( () => {
            this.account.clear();
            this.backButtonListener();
            this.backButtonListener = undefined;
            this.navCtrl.pop();
        });
    }

    agree(){
        this.account.agreeTermsAndConditions();
    }

    back(){
        this.account.clear();
        this.navCtrl.pop();
    }

    ngOnDestroy(){
        if( this.backButtonListener ){
            this.backButtonListener();
        }
    }
}
