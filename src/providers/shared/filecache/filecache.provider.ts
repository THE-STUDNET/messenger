import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file';
import { _getDeferred } from '../../../functions/getDeferred';

var deferred: any = _getDeferred();

@Injectable()
export class FileCache {

    public dir: string = this.file.cacheDirectory;
    public promises: any = {};

    constructor( public file:File ) {}


    tokenIsCached( token:string ){
        return this.file.checkFile( this.dir, token );
    }

    getFile( token:string, path?:string ){
        return this.tokenIsCached( token ).then( exist => {
            if( exist ){
                return this.file.resolveDirectoryUrl( path || this.dir ).then( de => {
                    return this.file.getFile( de, token, {create:false, exclusive:false}).then( fe => {
                        console.log('GETFILE', fe );
                        return fe.toURL();
                    });
                });
            }else{
                throw exist;
            }
        });
    }

    checkFile( token, path? ){
        return this.file.checkFile( path||this.dir, token );
    }

    createFile( token, blob, path? ){
        return this.file.writeFile( path || this.dir, token, blob );
    }

    createFileFromUrl( url:string, token:string, path?:string ){
        if( !this.promises[token] ){
            console.log('CREATE FILE FROM URL', url, token);

            let xhr = new XMLHttpRequest(),
                deferred = _getDeferred();

            xhr.open('GET', url );
            xhr.responseType = 'blob';
            xhr.onload = () => {
                let blob = xhr.response;
                console.log('BLOB', blob );
                this.createFile( token, blob, path );
                deferred.resolve( URL.createObjectURL(blob) );
                delete(this.promises[token]);
            }

            xhr.onerror = e=>{
                console.log('ERROR GET', url, e);
                deferred.reject();
                delete(this.promises[token]);
            };

            xhr.send();

            this.promises[token] = deferred.promise;
            return deferred.promise;
        }
        return this.promises[token];        
    }
}