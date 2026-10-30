import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LondonPrelude from '@/components/trip/LondonPrelude.vue'
import TripReader from '@/components/trip/TripReader.vue'
import { icelandJourney } from '@/data/icelandJourney'
import { londonSeedItems } from '@/domain/londonJourney'
import { londonPrelude } from '@/data/londonPrelude'
import ItineraryDates from '@/components/trip/ItineraryDates.vue'
const sharedJourney = () => ({ ...icelandJourney,members:icelandJourney.members.map((member,index)=>({...member,displayName:['U','jinyo','Kevin Ho か','Rosanne 🌹','YU','思辰'][index]})),items:[...icelandJourney.items,...londonSeedItems(icelandJourney.tripId)] })
describe('London early group', () => {
 it('keeps the six dates and only the four confirmed people', async () => {
  expect(londonPrelude.days.map(day => day.date)).toEqual(['2026-10-24','2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29'])
  expect(londonPrelude.memberIds).toEqual(['member-2','member-3','member-4','member-5'])
  const wrapper = mount(LondonPrelude,{props:{journey:sharedJourney()}})
  await wrapper.findAll('[role="tab"]')[0].trigger('click')
  expect(wrapper.get('.prelude-people').text()).toBe('參加：jinyo、Kevin Ho か、Rosanne 🌹、YU')
  expect(wrapper.text()).not.toContain('思辰')
  expect(wrapper.text()).toContain('Cockfosters')
  expect(wrapper.findAll('[role="tab"]')[0].text()).toContain('10/24（六）')
  expect(wrapper.get('.daily-heading').text()).toContain('Day 01')
  expect(wrapper.find('.prelude-day-note, .prelude-transition, .prelude-heading, footer').exists()).toBe(false)
 })
 it('switches dates and preserves opening hours, transit and alternatives', async () => {
  const wrapper = mount(LondonPrelude,{props:{journey:sharedJourney()}})
  await wrapper.findAll('[role="tab"]')[1].trigger('click')
  expect(wrapper.text()).toContain('High Street Kensington（Stop B）')
  expect(wrapper.text()).toContain('10:00–17:50')
  await wrapper.findAll('[role="tab"]')[4].trigger('click')
  expect(wrapper.text()).toContain('09:45 到 Victoria Memorial')
  expect(wrapper.text()).toContain('Westminster Pier → Tower Pier')
  expect(wrapper.text()).toContain('Wild Mushroom Ristotto')
  await wrapper.findAll('[role="tab"]')[5].trigger('click')
  expect(wrapper.text()).toContain('Lyceum Theatre《獅子王》')
  expect(wrapper.text()).toContain('Flat Iron Soho')
 })
 it('includes the complete supplied six-day London and Cambridge schedule in order', () => {
  expect(londonPrelude.days.map(day=>day.stops.map(stop=>stop.name))).toEqual([
   ['前往 Hammersmith'],
   ['紅色雙層巴士 9 號','The Muffin Man Tea Shop','自然史博物館','V&A 維多利亞與亞伯特博物館','Lina Stores South Kensington','Harrods'],
   ["前往 London King's Cross","King's College、King's Parade",'Fitzbillies','Lets Go Punting Cambridge',"Pizza Union King's Cross",'Duck & Waffle'],
   ['Arsenal Stadium 酋長球場','Camden Lock Market','The Cheese Wheel','Dishoom Carnaby','La Maritxu Soho','Oxford St.／Regent St.'],
   ['Westminster Bridge','大笨鐘','K2 Telephone Box','白金漢宮衛兵交接','Uber Boat','倫敦塔、塔橋','Borough Market 波羅市場','Bread Ahead','The Black Pig','Wild Mushroom Ristotto','Selfridges','The Mayfair Chippy'],
   ['大英博物館','Covent Garden','Bancone Covent Garden','Lyceum Theatre《獅子王》'],
  ])
  const schedule = londonPrelude.days.flatMap(day=>day.stops.map(stop=>stop.note)).join(' ')
  expect(schedule).toContain('High Street Kensington（Stop B）')
  expect(schedule).toContain('Cambridge Station')
  expect(schedule).toContain('09:45 到 Victoria Memorial 等待，11:00 交接')
  expect(schedule).toContain('Westminster Pier → Tower Pier')
  expect(schedule).toContain('11:30–22:00')
 })
 it('edits live shared activities and provides activity IDs to comments', async () => {
  const journey = { ...icelandJourney, items: [...icelandJourney.items,...londonSeedItems(icelandJourney.tripId)] }
  const wrapper = mount(LondonPrelude,{props:{journey,canEdit:true,sharedReady:true,editing:true},slots:{comments:'<template #default="{ item }"><span :data-comment-id="item.id" /></template>'}})
  await wrapper.findAll('[role="tab"]')[1].trigger('click')
  expect(wrapper.find('[data-comment-id="london-2026-10-25-3"]').exists()).toBe(true)
  await wrapper.get('.activity-editor input').setValue('更新後的倫敦活動')
  expect(wrapper.emitted('edit-item')?.[0]).toEqual(['london-2026-10-25-1',{name:'更新後的倫敦活動'}])
  wrapper.unmount()
 })
 it('only renders stored shared content without an import or preview state', () => {
  const wrapper = mount(LondonPrelude,{props:{journey:icelandJourney,sharedReady:true,canEdit:false}})
  expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('Hammersmith')
  expect(wrapper.text()).not.toContain('加入共同行程')
  expect(wrapper.text()).not.toContain('預覽')
 })
 it('shows the London itinerary to visitors without the participant line', async () => {
  const wrapper = mount(TripReader)
  await wrapper.get('#leg-tab-london').trigger('click')
  await wrapper.get('#day-tab-2026-10-24').trigger('click')
  expect(wrapper.find('[aria-label="行程段落"]').exists()).toBe(false)
  expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('Hammersmith')
  expect(wrapper.find('.prelude-people').exists()).toBe(false)
  expect(wrapper.text()).not.toMatch(/jinyo|Kevin Ho|Rosanne|YU/)
  wrapper.unmount()
 })
 it('uses one date selector per journey leg in the private itinerary', async () => {
  const journey = sharedJourney()
  const wrapper = mount(TripReader,{ props:{companionMode:true,publicOnly:false,journey},slots:{prelude:({date})=>h(LondonPrelude,{journey,date,embedded:true})} })
  await wrapper.get('#leg-tab-london').trigger('click')
  await wrapper.get('#day-tab-2026-10-24').trigger('click')
  expect(wrapper.find('[aria-label="倫敦前段行程"]').isVisible()).toBe(true)
  expect(wrapper.text()).toContain('一起去倫敦・冰島')
  expect(wrapper.findAll('[aria-label="行程日期"] [role="tab"]')).toHaveLength(6)
  expect(wrapper.find('[aria-label="行程日期"] [role="tab"]').attributes('aria-label')).toContain('10月24日')
  expect(wrapper.find('[aria-label="行程段落"]').exists()).toBe(false)
  expect(wrapper.find('.clocks').text()).toContain('倫敦')
  expect(wrapper.find('.clocks').text()).toContain('台灣')
  expect(wrapper.findAllComponents(ItineraryDates)).toHaveLength(1)
  expect(wrapper.findAll('#view-daily [role="tabpanel"]')).toHaveLength(1)
  expect(wrapper.find('.trip-segment-heading, .prelude-heading').exists()).toBe(false)
  expect(wrapper.find('.prelude-people').isVisible()).toBe(true)
  await wrapper.get('#leg-tab-iceland').trigger('click')
  expect(wrapper.findAll('[aria-label="行程日期"] [role="tab"]')).toHaveLength(9)
  await wrapper.get('#day-tab-2026-10-30').trigger('click')
  expect(wrapper.find('[aria-label="倫敦前段行程"]').exists()).toBe(false)
  expect(wrapper.find('.prelude-people').exists()).toBe(false)
  expect(wrapper.get('.daily-heading').text()).toContain('Day 01')
  wrapper.unmount()
 })
})
