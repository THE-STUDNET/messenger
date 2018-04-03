import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { FileCache } from '../filecache/filecache.provider';

@Injectable()
export class Upload {
    public upload_path = this.config.dms.protocol+':'+this.config.dms.base_url+this.config.dms.paths.upload;

    constructor( @Inject('Configuration') public config, public fileCache: FileCache ) {}

    //retry(  )

    send( fileOrBlob, filename ){
        const observers = [];

        let xhr = new XMLHttpRequest(),
            formData = new FormData(),
            upload = new Observable( observer => {
                observers.push( observer );

                console.log('SUBSCRIBE?', observers);

                if( observers.length === 1 ){
                    xhr.send( formData );
                }

                return {
                    unsubscribe( abort?:boolean ){
                        observers.splice(observers.indexOf(observer), 1);
                        if( abort ){
                            xhr.abort();
                        }
                    }
                }
            });
            
        console.log('BUILD?');
            
        // Set formData file
        if( filename ){
            formData.append( 'token', fileOrBlob, filename);
        }else{
            formData.append( 'token', fileOrBlob);
        }

        // Init request.
        xhr.open('POST', this.upload_path );
        //xhr.responseType = 'json';

        xhr.upload.addEventListener('progress', evt => {
            observers.forEach( observer => observer.next({progress: Math.round(1000 * evt.loaded / evt.total)/10,token:undefined}) );
        });

        xhr.addEventListener('abort', evt => {
            observers.forEach( observer => observer.error(evt) );
        });

        xhr.addEventListener('error', evt => {
            observers.forEach( observer => observer.error(evt) );
        });

        xhr.addEventListener('load', evt => {
            var responseObject = {token:undefined};
            try{
                responseObject = JSON.parse( xhr.response );
            }catch( e ){
                observers.forEach( observer => observer.error(evt) );
                console.log('XHR RESPONSE IS NOT CORRECT JSON', e);
            }

            observers.forEach( observer => {
                observer.next({ progress:100, token: responseObject.token });
                observer.complete();
            });
        });


        return {xhr:xhr, observable: upload };
    }

}