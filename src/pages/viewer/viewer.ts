import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Slides, ToastController } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { StatusBar } from '@ionic-native/status-bar';
import { FileOpener } from '@ionic-native/file-opener';
import { File } from '@ionic-native/file';

import { UserModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';
import { PlayerComponent } from '../../components/player/player';
import { FileCache } from '../../providers/shared/shared.module';


@Component({
  selector: 'page-viewer',
  templateUrl: 'viewer.html'
})
export class ViewerPage {
    @ViewChild(Slides) slides: Slides;

    public libraries: any[];
    public initialIndex: number;
    public hideControls: boolean = false;
    public opening: boolean = false;

    public currentPlayer: PlayerComponent;

    constructor(public navCtrl: NavController, public params:NavParams, private iab: InAppBrowser, 
        public status: StatusBar, public userModel: UserModel, public pipes:PipesProvider,
        public fileOpener: FileOpener, public file:File, public fileCache: FileCache, public toast: ToastController ) {
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
        this.opening = false;
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

    _openDocument( path, type ){
        this.fileOpener.open( path, type ).then(
            ()=>{ console.log('file opened!'); this.opening = false; },
            e=>{ 
                console.log('openDoc', e);
                if( e.message.indexOf('File not found') !== -1 ){
                    setTimeout( ()=>this._openDocument( path, type), 100 );
                }else{
                    this.toast.create({
                        message: 'File downloaded to your application data directory...',
                        duration: 3000
                    }).present();

                    this.opening = false;
                }
            }
        );
    }

    download( document ){
        let url = this.pipes.dmsUrl( document.token ),
            name = document.token;

        if( document.name && document.name.match(/.+\..+/) ){
            name = document.name;
        }

        this.opening = true;
        this.fileCache.checkFile( name, this.file.externalApplicationStorageDirectory ).then( exist => {
            if( this.opening ){
                this._openDocument( this.file.externalApplicationStorageDirectory + name, document.type );
            }
        }, e => {
            if( this.opening ){
                this.fileCache.createFileFromUrl( url, name, this.file.externalApplicationStorageDirectory ).then( ()=>{
                    if( this.opening ){                 
                        this._openDocument( this.file.externalApplicationStorageDirectory + name, document.type );
                    }
                }, e => { 
                    this.opening = false;
                    console.log( 'Error creating file', e);
                });
            }
        });

        /*
        this.toastCtrl.create({
            message: this.network.type === 'none' ? 'No internet connection, retry later!':'Sorry, an error occured!',
            duration: 3000
        }).present();
        */
    }
}