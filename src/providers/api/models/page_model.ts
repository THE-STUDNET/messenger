import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class PageModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'pg.',
            cache_list_name: 'pg.ids',
            _method_get: 'page.get',
        }, api );
    }

}
