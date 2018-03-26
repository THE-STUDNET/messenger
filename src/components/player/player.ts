import { Component, Input, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ViewerPage } from '../../pages/viewer/viewer';

@Component({
    selector: 'player',
    templateUrl: 'player.html'
})
export class PlayerComponent {
    @Input('src') src: any;
    @Input('poster') poster: any;
    @ViewChild('video') video: ElementRef;
    @ViewChild('time') time: ElementRef;
    @ViewChild('duration') duration: ElementRef;
    @ViewChild('position') position: ElementRef;
    @ViewChild('play') actionBtn: ElementRef;

    public controlDisplayed: boolean = true;
    public timeoutId:any;
    
    constructor( public el:ElementRef){}

    ngOnChanges( changes: SimpleChanges){
        if( this.video ){
            this.video.nativeElement.src = this.src;
            this.video.nativeElement.poster = this.poster;

            if( changes.src && changes.src.previousValue !== changes.src.currentValue ){
                this.video.nativeElement.pause();

                this.time.nativeElement.textContent = '-';
                this.duration.nativeElement.textContent = '-';
                this.position.nativeElement.style.width = '0%';
            }
        }
    }

    ngAfterViewInit(){
        this.video.nativeElement.addEventListener('durationchange', ()=> this.updateDuration() );
        this.video.nativeElement.addEventListener('timeupdate', ()=> this.updateTime() );
        this.video.nativeElement.addEventListener('play', ()=> this.playing() );
        this.video.nativeElement.addEventListener('pause', ()=> this.paused() );

        this.video.nativeElement.src = this.src;
        this.video.nativeElement.poster = this.poster;
    }

    updateDuration(){
        if( this.video.nativeElement.duration ){
            this.duration.nativeElement.textContent = this.formatTime( this.video.nativeElement.duration );
        }else{
            this.duration.nativeElement.textContent = '-';
        }        
        this.updatePosition();
    }

    updateTime(){
        this.time.nativeElement.textContent = this.formatTime( this.video.nativeElement.currentTime );
        this.updatePosition();
    }

    updatePosition(){
        if( this.video.nativeElement.duration ){
            console.log( parseInt(this.video.nativeElement.currentTime) , parseInt(this.video.nativeElement.duration) , '%?');
            this.position.nativeElement.style.width = (100 * (parseInt(this.video.nativeElement.currentTime) / parseInt(this.video.nativeElement.duration)) )+'%';
        }else{
            this.position.nativeElement.style.width = '0%';
        }
    }

    formatTime( seconds ){
        seconds = parseInt(seconds);

        let h = Math.floor( seconds / 3600 ), 
            m = Math.floor( (seconds-h*3600) / 60 ), 
            s = seconds - m*60 - h*3600;

        return (h?h+':':'')+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
    }

    onTouch( event ){
        if( this.video.nativeElement.duration && event.touches.length ){

            let x = event.touches[0].pageX,
                rect = this.position.nativeElement.parentElement.getBoundingClientRect(),
                time = this.video.nativeElement.duration * ( x - rect.left ) /rect.width; 

            this.seek( time );
        }
    }

    seek( time ){
        this.video.nativeElement.currentTime = time;
    }

    togglePlay(){
        if( this.video.nativeElement.paused ){
            this.video.nativeElement.play();
        }else{
            this.video.nativeElement.pause();
        }
    }

    playing(){
        this.actionBtn.nativeElement.classList.remove('i-media');
        this.actionBtn.nativeElement.classList.add('i-pause');
        if( !this.timeoutId ){
            this.timeoutId = setTimeout( ()=>{
                this.hideControls();
            }, 2700);
        }
    }

    paused(){
        this.actionBtn.nativeElement.classList.add('i-media');
        this.actionBtn.nativeElement.classList.remove('i-pause');
        this.showControls();
    }

    showControls(){
        this.el.nativeElement.classList.remove('hide-controls');
        this.controlDisplayed = true;

        if( !this.video.nativeElement.paused ){
            this.timeoutId = setTimeout( ()=>{
                this.hideControls();
            }, 2700);
        }
    }

    hideControls( force?:boolean ){
        if( force && this.timeoutId ){
            clearTimeout( this.timeoutId );
        }
        
        this.controlDisplayed = false;
        this.el.nativeElement.classList.add('hide-controls');
        this.timeoutId = undefined;
    }

    toggleControls(){
        if( this.controlDisplayed && !this.video.nativeElement.paused ){
            this.hideControls( true );
        }else{
            this.showControls();
        }
    }
}