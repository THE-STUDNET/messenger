import { Injectable } from '@angular/core';
import { _getDeferred } from '../../../functions/getDeferred';
import io from 'socket.io-client';

var deferred: any = _getDeferred();

@Injectable()
export class WebSocket {

    public id: number;
    public token: string;
    public socket:any;
    public promise:Promise<any>=deferred.promise;

    get(){
        return this.promise;
    }

    connect( url:string, id:number, token: string, options = {} ){
        this.id = id;
        this.token = token;

        if( this.socket ){
            this.socket.connect();
        }else{
            this.socket = io( url, Object.assign({secure:true},options));

            this.socket.on('authenticated',() => {
                this.socket._isAuthenticated = true;
                deferred.resolve( this.socket );
            });

            this.socket.on('connect',() => {
                this.socket.emit('authentify',{
                    connection_token: Date.now()+(Math.random()+'').slice(2)+ this.id,
                    authentification: this.token,
                    id : this.id,
                    connected: true
                });
            });
        }
    }

    disconnect(){
        if( this.socket ){
            this.socket.disconnect();
            this.socket._isAuthenticated = false;
        }
    }
}

//var wsurl = location.protocol+'//'+CONFIG.rt.domain+':'+CONFIG.rt.port;