import { Injectable, Inject } from '@angular/core';
import { Account } from '../providers/api/services/account.provider';

const days = [
    'Sun.',
    'Mon.',
    'Tues.',
    'Wed.',
    'Thurs.',
    'Fri.',
    'Sat.'
];

const durations = {
    minute: 1000*60,
    hour: 1000*60*60,
    day: 1000*60*60*24,
    year: 1000*60*60*24*365,
};

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

@Injectable()
export class PipesProvider {

    public conversations: Array<any> = [];

    constructor( public account: Account, @Inject('Configuration') public config ) {}

    username( user: any, short?: boolean, you?: boolean ): string{
        if( user ){
            if( you && this.account.session.id === user.id ){
                return 'You';
            }else if( short ){
                return user.firstname && user.lastname ? user.firstname[0].toUpperCase()+'. '+user.lastname: (user.nickname||user.email);
            }else{
                return user.nickname || (user.firstname &&  (user.firstname+' '+user.lastname) ) || user.email;
            }
        }
    }

    userletter( user: any ): string {
        return (user.nickname||user.firstname||user.lastname||user.email)[0];
    }

    initials( user: any ): string{
        let initials = '';
        if( user.firstname ){
            initials += user.firstname[0].toUpperCase()+'.';
            if( user.lastname ){
                initials += user.lastname[0].toUpperCase()+'.';
            }
        }else if( user.nickname ){
            user.nickname.split(' ').forEach( part => initials+=part.toUpperCase()+'.' );
        }else{
            initials+= user.email[0].toUpperCase()+'.'
        }
        return initials;
    }

    dmsUrl( token: string, size?:any[] ): string {
        if( token ){
            var resize = '';
            if( size && size.length ){
                resize = '-'+ ( window.devicePixelRatio * size[0] )
                    + (size[1]||'') +( size[2]? window.devicePixelRatio * size[2]:'' );
            }
            return (token.indexOf('assets/')!==-1||token.indexOf('blob:')!==-1||token.indexOf('http')!==-1)?
                token:(this.config.dms.protocol?this.config.dms.protocol+':':'')
                +this.config.dms.base_url+this.config.dms.paths.datas+'/'+token+resize;
        }
    }

    dmsBackgroundUrl( token: string): any {
        if( token ){
            if( token.indexOf('http')!==-1 || token.indexOf('assets/')!==-1 || token.indexOf('blob:')!==-1 ){
                return {'background-image':'url("'+token+'")'};
            }
            return {'background-image':'url("'+ (this.config.dms.protocol?this.config.dms.protocol+':':'')
                +this.config.dms.base_url+this.config.dms.paths.datas+'/'+token+'")'};
        }
        return undefined;
    }

    since( date: string ): any{
        if( date ){
            var now = new Date(),
                d = new Date( date ),
                diff = now.getTime() - d.getTime();

            if( diff < durations.minute ){
                return 'Now';
            }
            else if( now.toDateString() === d.toDateString() ){
                let h = d.getHours(), 
                    hour = h%12,
                    ext = h > 11?'PM':'AM';
                return (!hour?'12':hour)+':'+('0'+d.getMinutes()).slice(-2)+' '+ext;
            }else if( diff < durations.day*6 ){
                return days[d.getDay()];
            }else if( diff < durations.year ){
                return months[d.getMonth()].slice(0,3) + ' ' + d.getDate();
            }else{
                return d.getFullYear();
            }
        }
    }
}
