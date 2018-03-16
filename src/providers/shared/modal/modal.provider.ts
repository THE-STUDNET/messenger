import { Injectable } from '@angular/core';

@Injectable()
export class ModalService {

    public modalComponent:any;

    setComponent( component ){
        this.modalComponent = component;
    }

    isDisplayed(){
        return this.modalComponent && this.modalComponent.displayed;
    }

    hide(){
        if( this.modalComponent ){
            this.modalComponent.unload();
        }
    }

    show( component, data ){
        if( this.modalComponent ){
            this.modalComponent.load( component, data );
        }
    }    
}