import { Injectable, Inject } from '@angular/core';
import { _getDeferred } from '../../../functions/getDeferred';

var deferred: any = _getDeferred();

@Injectable()
export class Upload {
    public upload_path = this.config.dms.protocol+this.config.dms.base_url+this.config.dms.paths.upload;

    constructor( @Inject('Configuration') public config ) {}


    upload( name, fileOrBlob, filename ){
        var xhr = new XMLHttpRequest(),
            deferred = _getDeferred(),
            formData = new FormData();

        // Set formData file
        if( filename ){
            formData.append( name, fileOrBlob, filename);
        }else{
            formData.append( name, fileOrBlob);
        }

        // Init request.
        xhr.open('POST', this.upload_path );
        //xhr.responseType = 'json';

        xhr.upload.addEventListener('progress', function(evt){
            deferred.notify(evt);
        });

        xhr.addEventListener('abort',function(evt){
            deferred.reject(evt);
        });

        xhr.addEventListener('error',function(evt){
            deferred.reject(evt);
        });

        xhr.addEventListener('load',function(evt){
            var responseObject = {};
            try{
                responseObject = JSON.parse( xhr.response );
            }catch( e ){
                deferred.reject(evt);
                console.log('XHR RESPONSE IS NOT CORRECT JSON', e);
            }
            deferred.resolve( responseObject );
        });

        // Send request
        xhr.send(formData);

        return {xhr:xhr, promise: deferred.promise};
    }

}