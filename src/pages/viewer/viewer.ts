import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Slides } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { StatusBar } from '@ionic-native/status-bar';
import { FileOpener } from '@ionic-native/file-opener';
import { FileTransfer } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';

import { UserModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';
import { PlayerComponent } from '../../components/player/player';


@Component({
  selector: 'page-viewer',
  templateUrl: 'viewer.html'
})
export class ViewerPage {
    @ViewChild(Slides) slides: Slides;

    public libraries: any[];
    public initialIndex: number;
    public hideControls: boolean = false;

    public currentPlayer: PlayerComponent;

    constructor(public navCtrl: NavController, public params:NavParams, private iab: InAppBrowser, 
        public status: StatusBar, public userModel: UserModel, public pipes:PipesProvider,
        public fileTransfer: FileTransfer, public fileOpener: FileOpener, public file:File ) {
        // hide status bar!
        this.status.hide();
        // Set libraries 
        this.libraries = params.get('libraries');
        // Set current 
        this.initialIndex = params.get('current')||0;

        console.log('LIB', this.libraries);
    }

    isPicture( document ){
        return document.type.slice(0,6) === 'image/';
    }

    isVideo( document ){
        return document.type.slice(0,6) === 'video/';
    }

    isAttachment( document ){
        return !this.isPicture( document ) && !this.isVideo( document );
    }

    navToLink( document ){
        this.iab.create( document.link ,'_system');
    }

    onSliding(){
        console.log('SLIDING');
        if( this.currentPlayer ){
            this.currentPlayer.video.nativeElement.pause();
            this.currentPlayer = undefined; 
        }
        this.hideControls = false;
    }

    onPlaying( player ){
        console.log('ON PLAYING', player );
        this.currentPlayer = player;
    }

    onControlDisplay( show ){
        console.log('Control display', show);

        this.hideControls = !show;
    }

    zoomChange( notzoomed ){
        console.log('LOCK?', !notzoomed );
        this.slides.lockSwipes( !notzoomed );
    }

    ngOnDestroy(){
        this.status.show();
    }

    back(){
        this.navCtrl.pop();
    }

    download( document ){
        let url = this.pipes.dmsUrl( document.token ),
            transfer =  this.fileTransfer.create();;

        transfer.download( url, this.file.documentsDirectory + document.token ).then(entry=>{
            console.log('Download complete!', entry.toUrl() );

            this.fileOpener.open( this.file.documentsDirectory + document.token, document.type ).then(
                ()=>console.log('file opened!'),
                e=> console.log('file not opening', e)
            );

        },err => console.log('Download failed', err));
    }
}