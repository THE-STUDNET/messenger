import { Injectable } from '@angular/core';
import { statuses, events as statusEvents } from './constants';

import { Events } from '../../events/events.module';
import { WebSocket } from '../websocket/websocket.provider';

@Injectable()
export class UsersStatus {

    public ownstatus = statuses.connected;
    public status: any = {};
    public identifiers: any = {};

    private _interval_time: number = 1000*60;
    private _interval_id: number;

    constructor( public events: Events, public websocket: WebSocket ){

        websocket.get().then( socket => {

            // When websocket's connection go down -> set users status to unknow.
            socket.on('disconnect', () => {
                Object.keys(this.status).forEach( id => {
                    this.status[id].state = statuses.unknow;
                    events.process('userStatus#'+id, statuses.unknow );
                });
                clearInterval( this._interval_id );
            });
            // When user(s) status changed.
            socket.on('user_status_change', this.onStatusChange.bind(this) );
            // When user reconnect.
            socket.on('authenticated', () => {
                socket.emit('watch_user_status',{ users: Object.keys(this.status) });
                this.setInterval( socket );
            });
            // Refresh your own status at regular interval.
            this.setInterval( socket );

        });

    }

    setInterval( socket ){
        this._interval_id = setInterval( () => {
            socket.emit('status', this.ownstatus );
        }, this._interval_time);
    }

    onStatusChange( data ){
        var keys = Object.keys(statuses);

        Object.keys(data).forEach( (status_key) => {
            if( keys.indexOf(status_key) !==-1 ){
                var users = [];
                data[status_key].forEach( user_id => {
                    if( this.status[user_id] ){
                        users.push( parseInt(user_id) );
                        this.status[user_id].state = statuses[status_key];
                        // Send user changed state event.
                        this.events.process('userStatus#'+user_id, statuses[status_key] );
                    }
                });
                // Send global status event.
                this.events.process( statusEvents[statuses[status_key]], users );
            }
        });
    }

    watch( user_ids: number[], listenerIdentifier?:any ){
        var identifier = listenerIdentifier || ( Symbol? Symbol():(''+Date.now()+Math.random()) ),
            towatch = [];

        if( !this.identifiers[identifier] ){
            this.identifiers[identifier] = [];
        }

        user_ids.forEach( id => {
            if( !this.status[id] ){
                this.status[id] = {ids:[identifier],state:statuses.unknow};
                towatch.push( id );
            }else if( this.status[id].ids.indexOf(identifier) === -1 ){
                this.status[id].ids.push( identifier );
            }

            if( this.identifiers[identifier].indexOf(id) === -1 ){
                this.identifiers[identifier].push(id);
            }
        });

        this.websocket.get().then(function(socket){
            socket.emit('watch_user_status', { users: towatch });
        });

        return identifier;
    }

    unwatch( identifier:any, users?:number[] ){
        if( identifier && this.identifiers[identifier] ){
            var usersList = users || this.identifiers[identifier],
                toUnwatch = [];

            // Remove identifier from user listeners & delete user if there is no listeners left.
            usersList.forEach( (id) => {
                if( this.status[id] ){
                    this.status[id].ids.splice( this.status[id].ids.indexOf(identifier), 1 );
                    if( !this.status[id].ids.length ){
                        delete( this.status[id] );
                        toUnwatch.push( id );
                    }
                }
            });
            // Delete identifier if we remove all identifier watched users.
            if( !users ){                        
                delete( this.identifiers[identifier] );
            }
            // Notify realtime server to stop watching these users.
            this.websocket.get().then(socket => {
                socket.emit('unwatch_user_status', { users: toUnwatch });
            });
        }
    }

    getUserStatus( user_id: number ){
        if( this.status[user_id] ){
            return this.status[user_id].state;
        }else{
            return statuses.unknow;
        }
    }

    clear(){
        this.identifiers = {};
        Object.keys(this.status).forEach( id => {
            delete(this.status[id]);
        });
    }

}