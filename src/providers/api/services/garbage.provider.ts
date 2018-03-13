import { Injectable } from '@angular/core';
import { Events } from '../../events/events.provider';

@Injectable()
export class Garbage {

    public services: any = [];

    constructor( public events:Events ){}

    register( service ){
        this.services.push( service );
    }

    clear(){
        this.services.forEach( service => service.clear() );
    }
}