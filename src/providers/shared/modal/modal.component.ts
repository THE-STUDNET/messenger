import { Component, Input, ViewChild, ComponentFactoryResolver } from '@angular/core';
import { Platform } from 'ionic-angular';
import { ModalDirective } from './modal.directive';
import { ModalService } from './modal.provider';

@Component({
  selector: 'modal',
  templateUrl: 'modal.html'
})

export class ModalComponent {

    @ViewChild( ModalDirective ) host: ModalDirective;

    public displayed:boolean = false;
    public backButtonListener: any;

    constructor( private componentFactoryResolver: ComponentFactoryResolver, public service: ModalService, private platform:Platform) {}

    load( component, data ){
        let componentFactory = this.componentFactoryResolver.resolveComponentFactory( component );
        let viewRef = this.host.viewContainerRef;

        viewRef.clear();
        let componentRef = viewRef.createComponent(componentFactory);
        (<any>componentRef.instance).data = data;
        this.displayed = true;

        this.backButtonListener = this.platform.registerBackButtonAction( () => {
            this.unload();
        });
    }

    unload(){
        this.host.viewContainerRef.clear();
        this.displayed = false;
        if( this.backButtonListener ){
            this.backButtonListener();
        }
    }

    onOverlayTap( $event ){
        if( $event.target.id === 'modal' ){
            this.unload();
        }
    }

    ngAfterViewInit(){
        this.service.setComponent( this );
    }
}
