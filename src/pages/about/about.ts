import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {

    constructor(public navCtrl: NavController, public toastCtrl: ToastController ) {}


    back(){
        this.navCtrl.pop();
    }

}
