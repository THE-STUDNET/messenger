import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[backgroundImg]'
})
export class BackgroundImgDirective {

    @Input('backgroundImg') url: string;

    constructor( public el: ElementRef ) {}

    ngOnChanges(){
        if( this.url ){
            this.el.nativeElement.style.backgroundImage = '';
            this.el.nativeElement.classList.add('background-loading');
            this.el.nativeElement.classList.remove('background-loaded');

            let img = document.createElement('img');
            img.onload = () => {
                this.el.nativeElement.style.backgroundImage = 'url("'+this.url+'")';
                this.el.nativeElement.classList.remove('background-loading');
                this.el.nativeElement.classList.add('background-loaded');
            };

            img.onerror = () => {
                this.el.nativeElement.classList.remove('background-loading');
                this.el.nativeElement.classList.add('background-error');
            };

            img.src = this.url;
        }
    }
}