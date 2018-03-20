import { Directive, ElementRef, Input } from '@angular/core';
import { Platform } from 'ionic-angular';
import { FileCache } from '../providers/shared/shared.module';

@Directive({
  selector: '[backgroundImg]'
})
export class BackgroundImgDirective {

    @Input('backgroundImg') url: string;
    @Input('biToken') token?: string;
    public prevUrl: string;

    constructor( public el: ElementRef, public fileCache: FileCache, public platform: Platform ) {}

    ngOnChanges(){
        if( this.url && this.prevUrl !== this.url ){
            this.prevUrl = this.url;

            // Set loading style.
            this.el.nativeElement.style.backgroundImage = '';
            this.el.nativeElement.classList.add('background-loading');
            this.el.nativeElement.classList.remove('background-loaded');

            // Try to get image from cache if token defined.
            if( this.token && this.platform.is('cordova') ){
                this.getImage();
            }else{
                this.buildImage();
            }
        }
    }

    getImage(){
        this.fileCache.getFile( this.token ).then( url => {
            if( url ){
                this.displayImage(url);
            }else{
                this.fileCache.createFileFromUrl( this.url, this.token ).then( url => {
                    this.displayImage(url);
                }, () => {
                    this.buildImage();
                });
            }
        },e=>{
            this.fileCache.createFileFromUrl( this.url, this.token ).then( url => {
                this.displayImage(url);
            }, () => {
                this.buildImage();
            });
        });
    }

    buildImage(){
        let img = document.createElement('img');
        img.onload = () => { this.displayImage(this.url); };
        img.onerror = () => { this.displayError(); };
        img.src = this.url;
    }

    displayImage( url ){
        this.el.nativeElement.style.backgroundImage = 'url("'+url+'")';
        this.el.nativeElement.classList.remove('background-loading');
        this.el.nativeElement.classList.add('background-loaded');
    }

    displayError(){
        this.el.nativeElement.classList.remove('background-loading');
        this.el.nativeElement.classList.add('background-error');
    }
}