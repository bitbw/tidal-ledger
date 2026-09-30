import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, HelpCircle } from "lucide-react";

export const metadata: Metadata = { title: "账单导入使用说明 · 潮汐账本" };

const questions = [
  {
    question: "为什么有的记录没有分类，也没有 AI 建议？",
    answer: "可能是商户或商品说明不足以判断，AI 返回“无法确定”；也可能是 AI 未启用、调用失败，或超出单次待识别信息的数量上限（未另行设置时为 60 组）。此时请手动选择分类，再点“记住此商户分类”，下次优先按你的规则匹配。",
  },
  {
    question: "AI 建议的百分比是什么意思？",
    answer: "它是 AI 返回的置信度，不代表分类正确率。达到 85% 自动填入；低于 85% 仅显示建议，需要点“点击采纳”。无论是否自动填入，确认前都可以改分类。",
  },
  {
    question: "分类规则在哪里维护？",
    answer: "在首页“更多工具 → 映射管理”查看默认映射和添加自己的商户规则；也可以在预览中选好分类，点“记住此商户分类”。用户规则优先于默认规则，默认映射本身不可编辑。",
  },
  {
    question: "同一份账单再导入，会重复记账吗？",
    answer: "系统只在当前账本内查重：同一来源有交易单号时按单号查重；没有单号时按来源、时间、商户、金额、收支方向和手填备注生成指纹。预览中重复项不可勾选，确认导入时还会再检查一次。修改这些字段可能影响无单号记录的查重结果。",
  },
  {
    question: "“无效”和“待处理”有什么区别？",
    answer: "无效记录是解析时发现缺少交易时间或金额为 0／无效，点击预览顶部的“无效”可查看原因；待处理记录已进入预览，但可能没有分类或收支方向未确认。已勾选的待处理记录需补齐后才能确认导入，也可以取消勾选跳过。",
  },
  {
    question: "退款、转账或余额变动会自动抵消原账吗？",
    answer: "不会。系统根据账单字段推断收支方向，不自动抵消原消费，也不自动修正所有转账或理财记录。请在预览中确认收支方向、金额和分类，不需要的记录可以取消勾选。",
  },
];

export default function ImportHelpPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f5f7f7] text-[#303b44]">
      <div className="mx-auto min-h-[100dvh] max-w-[960px] bg-white md:shadow-[0_0_50px_rgba(16,33,36,.06)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ebeeee] bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-8">
          <Link href="/imports" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0c6f78] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c6f78]"><ArrowLeft size={17} />返回导入</Link>
          <span className="text-xs font-medium text-[#8b94a3]">账单导入 · 使用说明</span>
        </header>

        <div className="mx-auto max-w-[720px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
          <div className="mb-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf8f6] px-3 py-1.5 text-xs font-semibold text-[#0c6f78]"><HelpCircle size={14} />导入前先看这里</span>
            <h1 className="mt-4 text-[30px] font-bold tracking-tight text-[#173e41] sm:text-[38px]">账单导入怎么用</h1>
            <p className="mt-2 text-sm leading-7 text-[#687982]">先核对，再入账。分类和备注都能在预览中修改，不必直接接受自动识别的结果。</p>
            <p className="mt-2 text-xs text-[#89969d]">从导入页打开本说明会另开标签页；正在编辑的预览仍在原标签页。</p>
          </div>

          <section aria-labelledby="steps" className="border-t border-[#e6eeee] pt-7">
            <h2 id="steps" className="text-lg font-bold">从文件到入账</h2>
            <ol className="mt-5 space-y-4">
              <li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e5f7f4] text-xs font-bold text-[#0c6f78]">1</span><p className="text-sm leading-7"><b>选文件：</b>选择微信或支付宝导出的 CSV、Excel 或 ZIP。原文件在浏览器解析；解析出的记录会发到服务端查重、匹配分类。</p></li>
              <li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e5f7f4] text-xs font-bold text-[#0c6f78]">2</span><p className="text-sm leading-7"><b>逐笔确认：</b>检查收支方向、时间、金额、商户、商品说明和分类；可以修改、采纳建议或取消勾选。分类未补齐的已选记录不能导入。</p></li>
              <li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e5f7f4] text-xs font-bold text-[#0c6f78]">3</span><p className="text-sm leading-7"><b>确认导入：</b>只写入已勾选且有效、非重复的记录；一次最多确认 500 笔，更多请分批处理。</p></li>
            </ol>
          </section>

          <section aria-labelledby="matching" className="mt-9 border-t border-[#e6eeee] pt-7">
            <h2 id="matching" className="text-lg font-bold">分类是怎样匹配的</h2>
            <p className="mt-2 text-sm leading-7 text-[#687982]">按顺序尝试，先命中就不再交给后面的方式：</p>
            <div className="mt-4 rounded-2xl bg-[#f2f8f7] px-4 py-4 text-sm leading-8 text-[#24585d] sm:px-5">
              <b>我的商户规则</b> → <b>商品/商户关键词</b> → <b>餐饮时段分类</b> → <b>平台分类兜底</b> → <b>AI 建议</b> → <b>手动选择</b>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#687982]">系统会先按商品和商户关键词细分到已有小类，再参考平台分类；餐饮美食、外卖和餐馆类记录会按北京时间映射到早餐、午餐、晚餐或夜宵。信息不足的转账和模糊商户不会强行猜分类，常用商户可保存为自己的映射规则。</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#cdeae4] bg-[#f7fcfa] p-4"><b className="text-sm text-[#0c6f78]">AI ≥ 85%</b><p className="mt-2 text-sm leading-6 text-[#65747b]">自动填入，仍可手动修改。</p></div>
              <div className="rounded-2xl border border-[#f1dfb5] bg-[#fffaf0] p-4"><b className="text-sm text-[#93651d]">AI &lt; 85%</b><p className="mt-2 text-sm leading-6 text-[#806f53]">仅显示建议和置信度，点击采纳才会填入。</p></div>
            </div>
            <p className="mt-3 text-xs leading-6 text-[#829097]">AI 只在功能启用且有可用服务时处理前面未命中的记录；参考收支方向、商户、商品说明和账单交易分类。无法确定时可能不给建议，批量调用失败或超过处理上限的记录也可能需要手动分类。</p>
          </section>

          <section aria-labelledby="notes" className="mt-9 border-t border-[#e6eeee] pt-7">
            <h2 id="notes" className="text-lg font-bold">入账后，“备注”是怎么来的</h2>
            <p className="mt-2 text-sm leading-7 text-[#687982]">确认导入时，系统按这个顺序拼接非空字段，并用“ · ”分隔；商户和商品说明可在预览中修改：</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce9e8]">
              <div className="bg-[#eaf8f6] px-4 py-2 text-xs font-semibold text-[#0c6f78]">最终备注的组成</div>
              <div className="space-y-2 px-4 py-4 text-sm leading-7"><p className="font-semibold">商户 · 商品说明 · 收入/支出 · 手填备注</p><p className="text-[#697982]">例如：早餐店 · 豆浆和包子 · 支出 · 周末早餐</p></div>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#687982]">没填写手动备注就省略最后一段；商品说明为空也会跳过。账单中的“交易类型”可能用于识别或分类，<b className="text-[#30464a]">不会作为独立字段自动追加到最终备注</b>。分类名称和账户名称也不会拼到备注里。</p>
          </section>

          <section aria-labelledby="faq" className="mt-9 border-t border-[#e6eeee] pt-7">
            <h2 id="faq" className="text-lg font-bold">常见问题</h2>
            <div className="mt-3 divide-y divide-[#e9eeee]">
              {questions.map(({ question, answer }) => (
                <details key={question} className="group py-4">
                  <summary className="cursor-pointer list-none pr-4 text-sm font-semibold leading-6 marker:hidden [&::-webkit-details-marker]:hidden">{question}<span aria-hidden="true" className="float-right text-lg font-normal text-[#0c6f78] group-open:hidden">+</span><span aria-hidden="true" className="float-right hidden text-lg font-normal text-[#0c6f78] group-open:inline">−</span></summary>
                  <p className="mt-2 text-sm leading-7 text-[#687982]">{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <footer className="mt-8 rounded-2xl bg-[#eaf8f6] p-5 text-sm leading-7 text-[#416267]">
            原始账单文件不会直接上传；解析出的记录会提交到服务端用于查重与分类，启用 AI 时部分记录会发送给 AI 服务。请在预览确认信息后再导入。
            <Link href="/imports" className="mt-3 inline-flex items-center gap-1 font-semibold text-[#0c6f78] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c6f78]">返回账单导入 <ArrowUpRight size={15} /></Link>
          </footer>
        </div>
      </div>
    </main>
  );
}
