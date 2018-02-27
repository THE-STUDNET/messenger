import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class ItemModel extends AbstractModel {

    constructor(  public api: Api ){
        super( {
            cache_model_prefix: 'itm.',
            cache_list_name: 'itm.ids',
            _method_get: 'item.get',
        }, api );
    }

}
