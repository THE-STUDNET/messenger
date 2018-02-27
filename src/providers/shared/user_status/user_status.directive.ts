import { Directive, ElementRef, Input } from '@angular/core';
import { statuses } from './constants';
import { UsersStatus } from './user_status.provider';
import { Events } from '../../events/events.provider';

@Directive({
  selector: '[userStatus]'
})
export class UserStatusDirective {

    @Input('userStatus') users: number[];
    public watchId: any;
    public listeners: any[] = [];

    constructor( public el: ElementRef, public usersStatus: UsersStatus, public events: Events ) {}

    updateElement(){
        this.el.nativeElement.classList.remove('offline');
        this.el.nativeElement.classList.remove('online');

        if( this.hasSomeoneConnected() ){
            this.el.nativeElement.classList.add('online');
        }else{
            this.el.nativeElement.classList.add('offline');
        }
    }

    hasSomeoneConnected(){
        return this.users.some( user_id => {
            return this.usersStatus.status[user_id].state === statuses.connected;
        });
    }

    watch(){
        this.clear();
        if( this.users.length ){
            // Subscribe to users status
            this.watchId = this.usersStatus.watch( this.users );
            // Listen to users status change events
            this.users.forEach( user_id => {
                this.listeners.push( this.events.on('userStatus#'+user_id, this.updateElement.bind(this)) );
            });
            // Update element.
            this.updateElement();
        }
    }

    clear(){
        if( this.listeners.length ){
            this.listeners.forEach( id => {
                this.events.off( undefined, id);
            });
            this.listeners = [];
        }
        if( this.watchId ){
            this.usersStatus.unwatch( this.watchId );
            this.watchId = undefined;
        }
    }

    ngOnChanges(){
        this.watch();
    }

    ngOnDestroy(){
        this.clear();
    }
}