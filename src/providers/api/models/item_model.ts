import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class ItemModel extends AbstractModel {

    public _method_get: string = 'item.get';
    public cache_model_prefix: string = 'itm.';
    public cache_list_name: string = 'itm.ids';
    public cache_size: number = 0;

    constructor(  public api: Api ){
        super( api );
    }
}
