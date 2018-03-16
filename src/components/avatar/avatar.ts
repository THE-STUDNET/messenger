import { Component, Input } from '@angular/core';
import { UserModel } from '../../providers/api/api.module';
import { PipesProvider } from '../../pipes/pipes.provider';

@Component({
  selector: 'avatar',
  templateUrl: 'avatar.html'
})

export class AvatarComponent {

    @Input('user-id') user_id: number;
    @Input('size') size?: any[];

    loading: boolean = true;
    public user: any;

    constructor( private userModel:UserModel, public pipesProvider:PipesProvider ) {}

    ngOnChanges(){
        this.loading = true;

        if( !this.size ){
            this.size = [50,'x',50];
        }

        if( this.userModel.list[this.user_id] && this.userModel.list[this.user_id].datum ){
            this.user = this.userModel.list[this.user_id];
            this.loading = false;
        }else{
            this.userModel.queue([this.user_id]).then(()=>{
                this.user = this.userModel.list[this.user_id];
                this.loading = false;
            });
        }
    }
}
