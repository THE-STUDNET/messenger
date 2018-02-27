import { Injectable } from '@angular/core';
import { NativeAudio } from '@ionic-native/native-audio';

@Injectable()
export class SoundsManager {

    public sounds: string[] = ['newmessage'];

    constructor( private nativeAudio: NativeAudio ){
        this.nativeAudio.preloadSimple('newmessage', 'assets/sounds/newmessage.mp3');
    }

    play( name ){
        if( this.sounds.indexOf(name) !== -1 ){
            this.nativeAudio.play( name );
        }
    }

}
