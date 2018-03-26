import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ViewerPage } from '../../pages/viewer/viewer';

@Component({
    selector: 'file',
    templateUrl: 'file.html'
})
export class FileComponent {
    @Input('file') file: any;
    
    constructor( public navCtrl: NavController){}

    ngOnChanges(){
        
    }

    isPicture(){
        return this.file.type.slice(0,6) === 'image/';
    }

    isVideo(){
        return this.file.type.slice(0,6) === 'video/';
    }

    isAttachment(){
        return !this.isPicture() && !this.isVideo();
    }

    displayViewer( users:number[] ){
        this.navCtrl.push( ViewerPage,{libraries: [this.file] });
    }
}