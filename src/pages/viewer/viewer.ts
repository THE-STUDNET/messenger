import { Component, Inject } from '@angular/core';
import { NavController, NavParams, ToastController, Platform } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';


@Component({
  selector: 'page-viewer',
  templateUrl: 'viewer.html'
})
export class ViewerPage {

    public libraries: any[];
    public current: any;

    constructor(public navCtrl: NavController, public params:NavParams, public toastCtrl: ToastController, private iab: InAppBrowser ) {
        // Set libraries 
        this.libraries = params.get('libraries');
        // Set current 
        this.current = this.libraries[params.get('current')||0]
    }

    isPicture(){
        return this.current.type.slice(0,6) === 'image/';
    }

    isVideo(){
        return this.current.type.slice(0,6) === 'video/';
    }

    isAttachment(){
        return !this.isPicture() && !this.isVideo();
    }

    navToLink(){
        this.iab.create( this.current.link ,'_system');
    }

    printTitle(){
        
    }

    back(){
        this.navCtrl.pop();
    }
}