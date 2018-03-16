import { Directive, ElementRef } from '@angular/core';
import { Network } from '@ionic-native/network';

@Directive({
  selector: '[networkStatus]'
})
export class NetworkStatusDirective {
    subscriptions: any[];

    constructor( public el: ElementRef, public network: Network ) {
        if( this.network.type === 'none' ){
            this.el.nativeElement.classList.add('disconnected');
        }

        this.network.onDisconnect().subscribe(()=>{
            this.el.nativeElement.classList.add('disconnected');
        });
            
        this.network.onConnect().subscribe( ()=>{
            this.el.nativeElement.classList.remove('disconnected');
        });
    }

    ngOnDestroy(){
        this.subscriptions.forEach( s => s.unsubscribe() );
    }
}