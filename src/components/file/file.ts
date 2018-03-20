import { Component, Input } from '@angular/core';
import { Account, UserModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';


@Component({
    selector: 'file',
    templateUrl: 'file.html'
})
export class FileComponent {
    @Input('file') file: any;
    
    constructor(){}

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

}