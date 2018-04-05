import { Component, Input } from '@angular/core';
import { PipesProvider } from '../../pipes/pipes.provider';

@Component({
    selector: 'file',
    templateUrl: 'file.html'
})
export class FileComponent {
    @Input('file') library: any;
    
    public token: string;
    public url: any;

    constructor( public pipes: PipesProvider ){}

    ngOnChanges(){
        
        if( this.isPicture() || this.isVideo() ){
            if( this.library.token ){
                this.url = this.pipes.dmsUrl( this.library.token, [100,'m',100] );
                this.token = this.library.token+'100';
            }else if( this.library.file ){
                this.url = URL.createObjectURL( this.library.file);
                this.token = undefined;
            }
        }
        
    }

    isPicture(){
        return this.library.type.slice(0,6) === 'image/';
    }

    isVideo(){
        return this.library.type.slice(0,6) === 'video/';
    }

    isAttachment(){
        return !this.isPicture() && !this.isVideo();
    }
}