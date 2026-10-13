import { createApp } from 'vue'
import TripReader from '@/components/trip/TripReader.vue'
import { publicIcelandJourney } from '@/data/icelandPublic'
import './assets/main.css'
import './styles/globals.css'
import './share.css'

createApp(TripReader, { journey: publicIcelandJourney, publicOnly: true }).mount('#app')
