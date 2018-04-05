import { Directive, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { Platform, Gesture } from 'ionic-angular';
import { FileCache } from '../providers/shared/shared.module';
import { _getDeferred } from '../functions/getDeferred';

import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { Subscription } from 'rxjs/Subscription';

@Directive({
    selector: '[interactiveImg]'
})
export class InteractiveImageDirective {

    @Input('interactiveImg') url: string;
    @Input('ii-token') token?: string;

    @Output('zoomChange') zoomEmitter = new EventEmitter<any>();

    public prevUrl: string;
    public finalUrl: any;
    public loaded: boolean = false;

    public ratio: number = 1;
    public minRatio: number = 1;
    public x: number;
    public y: number;
    public realwidth: number;
    public realheight: number;
    public minWidth: number;
    public minHeight: number;
    public content: {top,left,width,height};

    // Touches & event variables...
    public lastTouch: any;
    public multiTouch: any = undefined;
    // Subscriber
    public orientationSubscription: Subscription;
    // Double Tap Gesture
    public doubleTapGesture: Gesture;    


    constructor( public el: ElementRef, public fileCache: FileCache, public platform: Platform, public orientation: ScreenOrientation ) {
        el.nativeElement.addEventListener('touchstart', event => this.ontouch(event) );
        el.nativeElement.addEventListener('touchmove', event => this.onmove(event) );
        el.nativeElement.addEventListener('touchend', () => this.endtouch() );
        el.nativeElement.addEventListener('touchleave', () => this.endtouch() );
        el.nativeElement.addEventListener('touchcancel', () => this.endtouch() );
        
        this.doubleTapGesture = new Gesture(this.el.nativeElement);
        this.doubleTapGesture.listen();
        this.doubleTapGesture.on('doubletap', () => {
            if( this.loaded ){
                if( this.ratio < this.minRatio*2 ){
                    this._setZoom( this.minRatio*2 );
                    this.setPosition( -this.minWidth/2, - this.minHeight/2 );
                }else{
                    this._setZoom( this.minRatio );                    
                    this.setPosition( 0, 0 );             
                }
                this.setStyle();
            }
        });
        
        this.orientationSubscription = this.orientation.onChange().subscribe( o => {
            this.reset();            
        });
    }

    reset(){
        setTimeout(()=>{
            if( this.content && this.content.height ){
                let r = this.el.nativeElement.getBoundingClientRect();
                if( r.width === this.content.height && r.height === this.content.width ){
                    this.setValues();
                    this.setPosition( 0, 0 );
                    this.setStyle();
                }else{
                    this.reset();
                }
            }
        },50);
    }

    ngOnDestroy(){
        this.doubleTapGesture.destroy();
    }

    ngOnChanges(){
        if( this.url && this.prevUrl !== this.url ){
            this.prevUrl = this.url;

            this.loaded = false;
            // Set loading style.
            this.el.nativeElement.style.backgroundImage = '';
            this.el.nativeElement.classList.add('background-loading');
            this.el.nativeElement.classList.remove('background-loaded');

            this.getFinalUrl().then( url => this.load( url ) );
        }
    }

    getFinalUrl(): Promise<any>{
        let deferred = _getDeferred();

        if( this.token && this.platform.is('cordova') ){
            this.fileCache.getFile( this.token ).then( entry => deferred.resolve(entry.toURL()), e => {
                this.fileCache.createFileFromUrl( this.url, this.token ).then( url => {
                    deferred.resolve(url)
                }, () => {
                    deferred.resolve(this.url);
                });
            });
        }else{
            deferred.resolve( this.url );
        }

        return deferred.promise;
    }

    load( url ){
        this.finalUrl = url;
        let img = document.createElement('img');
        img.onload = () => {
            this.realheight = img.naturalHeight;
            this.realwidth = img.naturalWidth;
            this.displayImage( url );
            this.loaded = true;
        };
        img.onerror = () => this.displayError();
        img.src = url;
    }

    displayImage( url ){
        this.setValues();
        this.setPosition( 0, 0 );
        this.setStyle();

        this.el.nativeElement.style.backgroundImage = 'url("'+url+'")';
        this.el.nativeElement.style.backgroundRepeat = 'no-repeat';
        this.el.nativeElement.classList.remove('background-loading');
        this.el.nativeElement.classList.add('background-loaded');
    }

    setValues(){
        let rect = this.el.nativeElement.getBoundingClientRect(),
            imgRatio = this.realwidth / this.realheight,
            bgRatio = rect.width / rect.height;
        // Set content screen positions & dimensions.
        this.content = {
            height: rect.height,
            width: rect.width,
            top: rect.top,
            left: rect.left
        };

        // Calculate min ratio (so image will always cover the element)
        if( bgRatio < imgRatio ){
            this.minRatio = 1;
            this.minWidth = rect.width;
            this.minHeight = rect.width * this.realheight / this.realwidth;
        }else{
            this.minRatio = rect.height * this.realwidth / ( this.realheight * rect.width );
            this.minHeight = rect.height / this.minRatio;
            this.minWidth = this.minHeight * this.realwidth / this.realheight;
        }

        this._setZoom( this.minRatio );

        console.log('VALUES', this.content, imgRatio, bgRatio );
        console.log('min', this.minWidth, this.minHeight,'ct', rect.width, rect.height, 'img', this.realwidth, this.realheight);
        console.log('RATIO?!', this.ratio, this.minRatio );
    }

    setZoom( touch ){
        console.log('SET_TOUCH', touch, this.multiTouch );

        let distance = this._getDistance( touch ),
            ratio = distance / this.multiTouch.distance;

        console.log('distance:', distance, 'ratio', ratio );

        // Set new ratio...
        this._setZoom( this.multiTouch.ratio * ratio );

        console.log('New RATIO => ', this.ratio );

        // Calculate position...
        let touchCenter = this._getCenter( this.multiTouch.touch ),
            futureImageCenterX = ( -this.multiTouch.originalX/2 + touchCenter.x )*this.ratio,
            futureImageCenterY = ( -this.multiTouch.originalY/2 + touchCenter.y )*this.ratio,
            futureX = -(futureImageCenterX - this.content.width/2),
            futureY = -(futureImageCenterY - this.content.height/2);
        // Set position...
        this.setPosition( futureX, futureY );
    }

    _setZoom( value ){
        this.ratio = Math.min( Math.max( value, this.minRatio ), 4);
        setTimeout( () => {
            this.zoomEmitter.emit( this.ratio === this.minRatio );
        });
    }

    setPosition( futureX, futureY ){
        let futureWidth = this.minWidth * this.ratio,
            futureHeight = this.minHeight * this.ratio,

            maxX = Math.max( ( this.content.width - futureWidth )/2, 0 ),
            maxY = Math.max( ( this.content.height - futureHeight )/2, 0 ),
            minX = futureWidth > this.content.width ? -(futureWidth - this.content.width): maxX,
            minY = futureHeight > this.content.height ? -(futureHeight - this.content.height): maxY;

        this.x = Math.min( Math.max( Math.round(futureX), minX), maxX );
        this.y = Math.min( Math.max( Math.round(futureY), minY), maxY );
        console.log('SET', minX, minY, maxX, maxY, futureX, futureY, this.x, this.y );
    }

    endtouch(){
        this.multiTouch = undefined;
        this.lastTouch = undefined;
    }

    ontouch( event ){
        if( this.loaded ){
            // Build touch.
            let touch = [ this._getTouchPositions(event.touches[0]) ];
            // If multi touch, set multitouch data (initial ratio & distance between touches) & register the second touch.
            if( event.touches.length > 1 ){
                touch.push( this._getTouchPositions(event.touches[1] ) );
                this.multiTouch = {
                    touch: touch,
                    distance: this._getDistance(touch),
                    ratio: this.ratio,
                    originalX: this.x,
                    originalY: this.y
                };
            }
            // Set last touch
            this.lastTouch = touch;
        }
    }
    // Return center position.
    _getCenter( touches ){
        return {
            x: ( touches[0].x + touches[1].x )/2,
            y: ( touches[0].y + touches[1].y )/2
        };
    }
    // Return touch position in element referential
    _getTouchPositions( originalTouch ){
        return {
            x: originalTouch.screenX - this.content.left,
            y: originalTouch.screenY - this.content.top
        };
    }
    // Return distance between 2 touches.
    _getDistance( touches ){
        return Math.sqrt( Math.pow(touches[0].x - touches[1].x, 2) + Math.pow(touches[0].y - touches[1].y, 2) );
    }

    onmove( event ){
        if( this.loaded ){
            var touch = [ this._getTouchPositions(event.touches[0]) ];
            // If there is more than one touch.
            if( event.touches.length > 1 ){
                touch.push( this._getTouchPositions(event.touches[1]) );
                // If user was already multi touching...
                if( this.multiTouch ){
                    this.setZoom( touch );

                // Else -> init multi touch data.
                }
                this.multiTouch = {
                    touch: touch,
                    distance: this._getDistance(touch),
                    ratio: this.ratio,
                    originalX: this.x,
                    originalY: this.y
                };
            }else{
                // Remove multitouch data if any...
                this.multiTouch = undefined;
            }

            // If there is another touch -> calculate background position.
            if( this.lastTouch ){
                let deltaX, deltaY;

                deltaX = touch[0].x - this.lastTouch[0].x;
                deltaY = touch[0].y - this.lastTouch[0].y;
                // If multi touch ( respect second touch movement )
                if( this.lastTouch.length > 1 && touch.length > 1 ){
                    deltaX = deltaX/2 + (touch[1].x - this.lastTouch[1].x)/2;
                    deltaY = deltaY/2 + (touch[1].y - this.lastTouch[1].y)/2;
                }
                this.setPosition( this.x + deltaX, this.y + deltaY );
            }

            this.lastTouch = touch;
            this.setStyle();
        }
    }

    setStyle(){
        this.el.nativeElement.style.backgroundPositionX = this.x +'px';
        this.el.nativeElement.style.backgroundPositionY = this.y +'px';
        this.el.nativeElement.style.backgroundSize = (100*this.ratio)+'%';

        console.log('?WTF', this.x +'px', this.y +'px', (100*this.ratio)+'%' );
    }

    displayError(){
        this.el.nativeElement.classList.remove('background-loading');
        this.el.nativeElement.classList.add('background-error');
    }
}