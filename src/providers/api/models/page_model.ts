import { Injectable } from '@angular/core';
import { Api } from '../services/api.provider';
import { AbstractModel } from './abstract_model';

@Injectable()
export class PageModel extends AbstractModel {

    public _method_get: string = 'page.get';
    public cache_model_prefix: string = 'pg.';
    public cache_list_name: string = 'pg.ids';

    constructor(  public api: Api ){
        super( api );
    }
}
